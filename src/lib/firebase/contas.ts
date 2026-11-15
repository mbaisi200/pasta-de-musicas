import 'server-only'

import { createSign } from 'node:crypto'

/**
 * Token de acesso (OAuth 2.0) da Service Account, sem depender da API key.
 *
 * O SDK Admin do Firebase usa o endpoint *cliente* do Authentication em
 * algumas operações (criar usuário), o que exige a `apiKey` do Web SDK.
 * Como a chave do Web SDK só existe depois de registrar o app no console,
 * usamos aqui os endpoints *administrativos* do Identity Toolkit, que
 * aceitam apenas o token da Service Account.
 */

function base64url(entrada: string): string {
  return Buffer.from(entrada).toString('base64url')
}

export async function gerarAccessToken(): Promise<string> {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin não configurado (FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY).')
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
  if (!resposta.ok || !dados.access_token) {
    throw new Error(`Falha ao gerar o token: ${JSON.stringify(dados)}`)
  }
  return dados.access_token
}

/**
 * Chamada a um endpoint do Identity Toolkit.
 *
 * `projeto = true`  → `/v1/projects/{id}/...` (operações administrativas:
 *                      criar conta, listar, apagar)
 * `projeto = false` → `/v1/...` (o endpoint de login, que aceita o token da
 *                      Service Account e não precisa da API key)
 */
export async function identityToolkit<T = Record<string, unknown>>(
  caminho: string,
  metodo: 'GET' | 'POST' | 'DELETE' = 'POST',
  corpo?: unknown,
  projeto = true,
): Promise<T> {
  const projectId = process.env.FIREBASE_PROJECT_ID
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID ausente.')

  const token = await gerarAccessToken()
  const base = projeto ? `/v1/projects/${projectId}${caminho}` : `/v1${caminho}`
  const resposta = await fetch(`https://identitytoolkit.googleapis.com${base}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  })

  const texto = await resposta.text()
  let dados: Record<string, unknown> = {}
  try {
    dados = texto ? JSON.parse(texto) : {}
  } catch {
    dados = { erro: texto.slice(0, 200) }
  }

  if (!resposta.ok) {
    const erro = dados?.error as { message?: string; errors?: { message: string }[] } | undefined
    const mensagem =
      erro?.message ??
      erro?.errors?.map((e) => e.message).join('; ') ??
      `HTTP ${resposta.status}`
    const excecao = new Error(mensagem) as Error & { status?: number }
    excecao.status = resposta.status
    throw excecao
  }
  return dados as T
}

/* ------------------------------------------------------------- contas */
export interface ContaFirebase {
  localId: string
  email: string
  displayName?: string
  passwordHash?: string
}

/** Cria uma conta (endpoint administrativo — não precisa de API key). */
export async function criarConta(
  email: string,
  senha: string,
  nome?: string,
): Promise<ContaFirebase> {
  return identityToolkit<ContaFirebase>('/accounts', 'POST', {
    email,
    password: senha,
    displayName: nome || undefined,
  })
}

/**
 * Autentica e-mail/senha no servidor, devolvendo o ID token.
 * É o equivalente a `signInWithEmailAndPassword`, sem o Web SDK.
 *
 * O endpoint vive na raiz da API (`/v1/accounts:signInWithPassword`): com o
 * token da Service Account ele já sabe em qual projeto está, então a
 * `apiKey` do console não é necessária.
 */
export async function autenticar(email: string, senha: string): Promise<string> {
  const resultado = await identityToolkit<{ idToken?: string }>(
    '/accounts:signInWithPassword',
    'POST',
    { email, password: senha, returnSecureToken: true },
    false,
  )
  if (!resultado.idToken) throw new Error('Não foi possível autenticar.')
  return resultado.idToken
}

/**
 * Lista as contas do projeto.
 *
 * Usa `accounts:query` — o `accounts:batchGet` devolve 404 nos projetos
 * criados no console novo.
 */
export async function listarContas(max = 200): Promise<ContaFirebase[]> {
  const resultado = await identityToolkit<{ userInfo?: ContaFirebase[] }>(
    '/accounts:query',
    'POST',
    { returnUserInfo: true, maxResults: max },
  )
  return resultado.userInfo ?? []
}

/** Procura uma conta pelo e-mail. */
export async function buscarContaPorEmail(email: string): Promise<ContaFirebase | null> {
  const resultado = await identityToolkit<{ userInfo?: ContaFirebase[] }>(
    '/accounts:query',
    'POST',
    { email: [email], returnUserInfo: true },
  )
  return resultado.userInfo?.[0] ?? null
}

/** Apaga uma conta. */
export async function excluirConta(uid: string): Promise<void> {
  await identityToolkit('/accounts:batchDelete', 'POST', { localIds: [uid] })
}

/** Existe alguma conta no projeto? (define se o cadastro está aberto) */
export async function totalDeContas(): Promise<number> {
  return (await listarContas(1000)).length
}
