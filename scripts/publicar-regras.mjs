/**
 * Publica as regras do Firestore sem precisar da CLI do Firebase.
 *
 * A CLI (`firebase deploy`) exige `firebase login` no terminal. Como o
 * projeto já tem uma Service Account (que é o que o app usa no servidor),
 * dá para publicar as regras direto pela API do Google — sem.authorization
 * extra, sem card, sem terminal.
 *
 *   node scripts/publicar-regras.mjs
 *   node scripts/publicar-regras.mjs ~/Downloads/chave-do-firebase.json
 *
 * O que faz:
 *   1. Lê as credenciais (do JSON da Service Account ou do .env.local)
 *   2. Gera um access token (JWT RS256) com a chave privada
 *   3. PATCH em https://firebaserules.googleapis.com  →  publica firestore.rules
 */
import { createSign } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = dirname(dirname(fileURLToPath(import.meta.url)))
const ARQ_REGRAS = join(raiz, 'firestore.rules')

/* ------------------------------------------------------------ credenciais */
function credenciaisDoJson(caminho) {
  const chave = JSON.parse(readFileSync(caminho, 'utf-8'))
  return {
    projectId: chave.project_id ?? chave.projectId,
    clientEmail: chave.client_email ?? chave.clientEmail,
    privateKey: (chave.private_key ?? chave.privateKey ?? '').replace(/\\n/g, '\n'),
  }
}

function credenciaisDoEnv() {
  const caminho = join(raiz, '.env.local')
  if (!existsSync(caminho)) return null
  const linhas = readFileSync(caminho, 'utf-8').split('\n')
  const valor = (nome) => {
    const linha = linhas.find((l) => l.startsWith(`${nome}=`))
    if (!linha) return ''
    return linha
      .slice(nome.length + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1')
      .replace(/\\n/g, '\n')
  }
  return {
    projectId: valor('FIREBASE_PROJECT_ID'),
    clientEmail: valor('FIREBASE_CLIENT_EMAIL'),
    privateKey: valor('FIREBASE_PRIVATE_KEY'),
  }
}

const argumento = process.argv[2]
let credenciais = null
let origem = ''

if (argumento && existsSync(resolve(argumento))) {
  credenciais = credenciaisDoJson(resolve(argumento))
  origem = basename(argumento)
} else {
  credenciais = credenciaisDoEnv()
  origem = '.env.local'
}

if (!credenciais?.projectId || !credenciais?.clientEmail || !credenciais?.privateKey) {
  console.error('Credenciais não encontradas.')
  console.error('  Use: node scripts/publicar-regras.mjs ~/Downloads/chave-do-firebase.json')
  console.error('  ou:  npm run config:env -- ~/Downloads/chave-do-firebase.json  (e depois este script)')
  process.exit(1)
}

/* ---------------------------------------------------------- access token */
function base64url(entrada) {
  return Buffer.from(entrada).toString('base64url')
}

async function gerarAccessToken({ clientEmail, privateKey }) {
  const agora = Math.floor(Date.now() / 1000)
  const cabecalho = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const corpo = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: agora,
      exp: agora + 3600,
    }),
  )
  const assinatura = createSign('RSA-SHA256')
    .update(`${cabecalho}.${corpo}`)
    .sign(privateKey, 'base64url')

  const resposta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${cabecalho}.${corpo}.${assinatura}`,
    }),
  })

  const dados = await resposta.json()
  if (!resposta.ok) {
    throw new Error(`Falha ao gerar o token: ${JSON.stringify(dados)}`)
  }
  return dados.access_token
}

/* --------------------------------------------------------------- regras */
/**
 * A API do Firebase Rules funciona em dois passos:
 *   1. cria um "ruleset" (a versão do arquivo de regras)
 *   2. aponta a "release" do Firestore para esse ruleset
 */
async function criarRuleset(token, projectId, conteudo) {
  const url = `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`
  const resposta = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: {
        files: [{ name: 'firestore.rules', content: conteudo }],
      },
    }),
  })

  const dados = await resposta.json()
  if (!resposta.ok) {
    throw new Error(`Falha ao criar o ruleset: ${JSON.stringify(dados)}`)
  }
  return dados
}

async function apontarRelease(token, projectId, rulesetName) {
  const nome = `projects/${projectId}/releases/cloud.firestore`

  // Se a release ainda não existe (projeto novo), cria; senão atualiza.
  const existente = await fetch(
    `https://firebaserules.googleapis.com/v1/${nome}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )

  const metodo = existente.status === 404 ? 'POST' : 'PATCH'
  const url =
    metodo === 'POST'
      ? `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`
      : `https://firebaserules.googleapis.com/v1/${nome}`

  const corpo =
    metodo === 'POST'
      ? { name: nome, rulesetName }
      : { release: { name: nome, rulesetName }, updateMask: 'rulesetName' }

  const resposta = await fetch(url, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(corpo),
  })

  const dados = await resposta.json()
  if (!resposta.ok) {
    throw new Error(`Falha ao publicar a release: ${JSON.stringify(dados)}`)
  }
  return dados
}

async function main() {
  console.log(`→ Credenciais: ${origem}`)
  console.log(`→ Projeto: ${credenciais.projectId}`)

  const token = await gerarAccessToken(credenciais)
  console.log('→ Access token obtido ✓')

  const conteudo = readFileSync(ARQ_REGRAS, 'utf-8')
  const ruleset = await criarRuleset(token, credenciais.projectId, conteudo)
  console.log(`→ Ruleset criado ✓ (${ruleset.name})`)

  const release = await apontarRelease(token, credenciais.projectId, ruleset.name)
  console.log('→ Regras publicadas ✓')
  console.log(`   release: ${release.name ?? 'cloud.firestore'}`)
  console.log(`   ruleset: ${release.rulesetName ?? ruleset.name}`)
  console.log('')
  console.log('   As regras agora bloqueiam qualquer acesso direto do navegador.')
  console.log('   O app continua funcionando: ele acessa o Firestore pelo servidor (Admin SDK).')
}

main().catch((erro) => {
  console.error('✖ Falhou:', erro.message ?? erro)
  process.exit(1)
})
