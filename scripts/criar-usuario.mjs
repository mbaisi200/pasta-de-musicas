/**
 * Cria (ou redefine a senha de) uma conta no Firebase Authentication.
 *
 *   npm run criar:usuario -- --email=ivan@email.com --senha="senha" --nome="Ivan"
 *   npm run criar:usuario -- --status      (diagnóstico do projeto)
 *
 * ...ou sem a senha na linha de comando:
 *
 *   SENHA="minha-senha" npm run criar:usuario -- --email=ivan@email.com --nome="Ivan"
 *
 * Usa o endpoint administrativo do Identity Toolkit (OAuth da Service Account),
 * que funciona mesmo antes de a API Key do Web SDK existir.
 */
import { credenciaisDoEnv, gerarAccessToken } from './lib/service-account.mjs'

/* ------------------------------------------------------------------ args */
const argumentos = process.argv.slice(2)
const valorDe = (nome) => {
  const achado = argumentos.find((a) => a.startsWith(`--${nome}=`))
  return achado ? achado.slice(nome.length + 3) : ''
}

const email = (valorDe('email') || process.env.EMAIL || '').trim().toLowerCase()
const senha = valorDe('senha') || process.env.SENHA || ''
const nome = valorDe('nome') || process.env.NOME || ''

/* ------------------------------------------------------------ credenciais */
function credenciais() {
  const c = credenciaisDoEnv()
  if (!c?.projectId || !c?.clientEmail || !c?.privateKey) {
    console.error(
      'Credenciais ausentes no .env.local (rode `npm run config:env -- <chave.json>`).',
    )
    process.exit(1)
  }
  return c
}

/* ------------------------------------------------------------ diagnóstico */
async function status() {
  const c = credenciais()
  const token = await gerarAccessToken(c)
  console.log(`Projeto: ${c.projectId}`)

  // O endpoint /config foi descontinuado; a consulta de contas serve para
  // saber se o Authentication está ativo (erro = não está).
  const consulta = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${c.projectId}/accounts:query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnUserInfo: true, maxResults: 200 }),
    },
  )
  const contas = await consulta.json().catch(() => ({}))
  const usuarios = contas.userInfo ?? []

  if (!consulta.ok) {
    console.log('Authentication: ❌ NÃO habilitado')
    console.log('')
    console.log('  1. https://console.firebase.google.com → selecione o projeto')
    console.log('  2. Menu lateral → Segurança → Authentication → Começar')
    console.log('  3. Aba "Método de login" → E-mail/Senha → Habilitar → Salvar')
    return
  }

  console.log('Authentication: ✅ habilitado')
  console.log(`Contas: ${usuarios.length}`)
  for (const u of usuarios) {
    console.log(`  • ${u.email}${u.displayName ? ` (${u.displayName})` : ''}`)
  }
}

/* ------------------------------------------------------------------ main */
async function main() {
  const c = credenciais()
  const token = await gerarAccessToken(c)

  const url = `https://identitytoolkit.googleapis.com/v1/projects/${c.projectId}/accounts`
  let existente = null

  const consulta = await fetch(`${url}:query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: [email], returnUserInfo: true }),
  })
  const contas = await consulta.json().catch(() => ({}))
  existente = (contas.userInfo ?? [])[0] ?? null

  if (existente) {
    const r = await fetch(`${url}:update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        localId: existente.localId,
        password: senha,
        displayName: nome || existente.displayName,
        email,
      }),
    })
    if (!r.ok) throw new Error((await r.json()).error?.message ?? 'Falha ao atualizar.')
    console.log(`✓ Conta atualizada (senha redefinida): ${email}`)
  } else {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: senha, displayName: nome || undefined }),
    })
    const dados = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(dados.error?.message ?? JSON.stringify(dados))
    console.log(`✓ Conta criada: ${email} (uid ${dados.localId})`)
  }

  await status()
}

/* ------------------------------------------------------------------ run */
if (argumentos.includes('--status')) {
  status().catch((erro) => {
    console.error('✖ Falhou:', erro.message ?? erro)
    process.exit(1)
  })
} else {
  if (!email || !senha) {
    console.error(
      'Uso: npm run criar:usuario -- --email=voce@email.com --senha="sua-senha" [--nome="Nome"]\n' +
        '     npm run criar:usuario -- --status',
    )
    process.exit(1)
  }
  if (senha.length < 6) {
    console.error('A senha precisa ter ao menos 6 caracteres.')
    process.exit(1)
  }
  main().catch((erro) => {
    const mensagem = erro?.message ?? String(erro)
    if (/CONFIGURATION_NOT_FOUND/i.test(mensagem)) {
      console.error('✖ O Authentication não está habilitado neste projeto do Firebase.')
      console.error('')
      console.error('  1. https://console.firebase.google.com → projeto "pasta-de-musicas-ivan"')
      console.error('  2. Menu lateral → Authentication → Começar')
      console.error('  3. Aba "Sign-in method" → E-mail/Senha → Habilitar → Salvar')
      console.error('')
      console.error('  Depois rode de novo este comando.')
    } else {
      console.error('✖ Falhou:', mensagem)
    }
    process.exit(1)
  })
}
