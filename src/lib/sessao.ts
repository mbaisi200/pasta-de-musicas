import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

import { getAuth } from '@/lib/firebase/admin'

/**
 * Sessão do usuário (padrão do Firebase).
 *
 * Fluxo:
 *   1. o navegador faz login com e-mail/senha (Firebase Web SDK)
 *   2. envia o ID token para POST /api/sessao
 *   3. o servidor valida esse token e devolve um **session cookie** (httpOnly)
 *   4. as próximas requisições usam só o cookie — o ID token não circula
 *
 * O session cookie é a parte importante: ele é httpOnly (o JavaScript da
 * página não enxerga), dura 5 dias e pode ser revogado no servidor.
 */

export const COOKIE_SESSAO = 'pasta_de_musicas_sessao'
const DURACAO_SESSAO_MS = 5 * 24 * 60 * 60 * 1000 // 5 dias

export interface UsuarioSessao {
  uid: string
  email: string
  nome: string
  /** Data (ISO) da criação da conta. */
  criadoEm: string
  /** O usuário é dono/administrador do app. */
  admin: boolean
}

/** Papéis que podem administrar usuários. */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function ehAdmin(email: string | undefined): boolean {
  if (!email) return false
  if (ADMIN_EMAILS.length === 0) {
    // Sem lista configurada, o primeiro usuário criado vira administrador.
    return false
  }
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

/** Cria o session cookie a partir de um ID token válido. */
export async function criarSessao(idToken: string): Promise<string> {
  const auth = getAuth()
  return auth.createSessionCookie(idToken, { expiresIn: DURACAO_SESSAO_MS })
}

/** Lê e valida o cookie da requisição atual. */
export async function usuarioDaRequisicao(): Promise<UsuarioSessao | null> {
  const cookie = (await cookies()).get(COOKIE_SESSAO)?.value
  if (!cookie) return null
  return usuarioDoCookie(cookie)
}

/** Valida um session cookie e devolve os dados do usuário. */
export async function usuarioDoCookie(cookie: string): Promise<UsuarioSessao | null> {
  try {
    const auth = getAuth()
    const decoded = await auth.verifySessionCookie(cookie, true)
    const email = decoded.email ?? ''
    return {
      uid: decoded.uid,
      email,
      nome: decoded.name || decoded.email || 'Usuário',
      criadoEm: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : '',
      admin: ehAdmin(email) || (await ehPrimeiroUsuario(decoded.uid)),
    }
  } catch {
    return null
  }
}

/**
 * O primeiro usuário do projeto é tratado como administrador — é ele quem
 * cria os demais. Sem isso, ninguém poderia cadastrar o resto da banda.
 */
async function ehPrimeiroUsuario(uid: string): Promise<boolean> {
  try {
    const auth = getAuth()
    const lista = await auth.listUsers(1)
    return lista.users.length > 0 && lista.users[0].uid === uid
  } catch {
    return false
  }
}

/** Quantos usuários existem no projeto (para decidir se o cadastro está aberto). */
export async function totalDeUsuarios(): Promise<number> {
  try {
    const auth = getAuth()
    const lista = await auth.listUsers(1000)
    return lista.users.length
  } catch {
    return 0
  }
}

/**
 * Escape para desenvolvimento: `SKIP_AUTH=1` ignora o login.
 * Nunca vale em produção (guarda dupla: variável + NODE_ENV).
 */
export function authIgnorado(): boolean {
  return process.env.SKIP_AUTH === '1' && process.env.NODE_ENV !== 'production'
}

const USUARIO_DE_TESTE: UsuarioSessao = {
  uid: 'modo-desenvolvimento',
  email: 'dev@local',
  nome: 'Modo desenvolvimento',
  criadoEm: '',
  admin: true,
}

/**
 * Usuário obrigatório (páginas do app).
 * Redireciona para a tela de login quando não há sessão válida.
 */
export async function exigirUsuario(): Promise<UsuarioSessao> {
  if (authIgnorado()) return USUARIO_DE_TESTE
  const usuario = await usuarioDaRequisicao()
  if (!usuario) redirect('/entrar')
  return usuario
}

/**
 * Usuário obrigatório (API).
 * Devolve uma resposta 401 quando não há sessão válida.
 */
export async function exigirSessaoApi(): Promise<
  { ok: true; usuario: UsuarioSessao } | { ok: false; resposta: NextResponse }
> {
  if (authIgnorado()) return { ok: true, usuario: USUARIO_DE_TESTE }
  const usuario = await usuarioDaRequisicao()
  if (!usuario) {
    return {
      ok: false,
      resposta: NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 }),
    }
  }
  return { ok: true, usuario }
}
