/**
 * Utilidades compartilhadas pelos scripts (credenciais da Service Account
 * e token de acesso via JWT RS256).
 */
import { createSign } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const RAIZ = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

/** Lê as credenciais do `.env.local`. */
export function credenciaisDoEnv(raiz = RAIZ) {
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
    apiKey: valor('NEXT_PUBLIC_FIREBASE_API_KEY'),
  }
}

/** Lê as credenciais de um JSON da Service Account. */
export function credenciaisDoJson(caminho) {
  const chave = JSON.parse(readFileSync(caminho, 'utf-8'))
  return {
    projectId: chave.project_id ?? chave.projectId,
    clientEmail: chave.client_email ?? chave.clientEmail,
    privateKey: (chave.private_key ?? chave.privateKey ?? '').replace(/\\n/g, '\n'),
  }
}

function base64url(entrada) {
  return Buffer.from(entrada).toString('base64url')
}

/**
 * Gera um access token (OAuth 2.0, JWT RS256) para a Service Account.
 * Escopo: cloud-platform (cobre Firestore, Identity Toolkit e Rules).
 */
export async function gerarAccessToken({ clientEmail, privateKey }) {
  if (!clientEmail || !privateKey) {
    throw new Error('Credenciais incompletas (client_email / private_key).')
  }
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
