/**
 * Cria (ou redefine a senha de) uma conta no Firebase Authentication.
 *
 *   npm run criar:usuario -- --email=ivan@email.com --senha="senha" --nome="Ivan"
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

if (!email || !senha) {
  console.error(
    'Uso: npm run criar:usuario -- --email=voce@email.com --senha="sua-senha" [--nome="Nome"]',
  )
  process.exit(1)
}
if (senha.length < 6) {
  console.error('A senha precisa ter ao menos 6 caracteres.')
  process.exit(1)
}

/* ------------------------------------------------------------ credenciais */
const credenciais = credenciaisDoEnv()
if (!credenciais?.projectId || !credenciais?.clientEmail || !credenciais?.privateKey) {
  console.error('Credenciais ausentes no .env.local (rode `npm run config:env -- <chave.json>`).')
  process.exit(1)
}

/* ------------------------------------------------------------------- api */
async function chamadaIdentityToolkit(token, caminho, metodo, corpo) {
  const resposta = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${credenciais.projectId}${caminho}`,
    {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    },
  )
  const dados = await resposta.json().catch(() => ({}))
  if (!resposta.ok) {
    const mensagem =
      dados?.error?.message ??
      (dados?.error?.errors?.map((e) => e.message).join('; ')) ??
      JSON.stringify(dados)
    throw new Error(mensagem)
  }
  return dados
}

async function main() {
  const token = await gerarAccessToken(credenciais)

  // Procura uma conta existente
  let existente = null
  try {
    const consulta = await chamadaIdentityToolkit(
      token,
      `/accounts:query` + '?key=',
      'POST',
      { email: [email] },
    )
    existente = consulta.users?.[0] ?? null
  } catch {
    // sem consulta — seguimos para a criação
  }

  if (existente) {
    await chamadaIdentityToolkit(
      token,
      `/accounts:update` + '?key=',
      'POST',
      {
        localId: existente.localId,
        password: senha,
        displayName: nome || existente.displayName,
        email,
      },
    )
    console.log(`✓ Conta atualizada (senha redefinida): ${email}`)
  } else {
    const criado = await chamadaIdentityToolkit(token, '/accounts?key=', 'POST', {
      email,
      password: senha,
      displayName: nome || undefined,
    })
    console.log(`✓ Conta criada: ${email} (uid ${criado.localId})`)
  }

  const lista = await chamadaIdentityToolkit(token, '/accounts:batchGet?key=', 'POST', {
    localIds: [],
    maxResults: 20,
  }).catch(() => null)

  console.log('\nPara conferir as contas:')
  console.log('  Firebase Console → Authentication → Users')
  if (lista?.users?.length) {
    for (const u of lista.users) {
      console.log(`  • ${u.email}${u.displayName ? ` (${u.displayName})` : ''}`)
    }
  }
}

main().catch((erro) => {
  console.error('✖ Falhou:', erro.message ?? erro)
  process.exit(1)
})
