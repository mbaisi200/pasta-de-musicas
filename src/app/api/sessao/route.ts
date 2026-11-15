import { NextResponse } from 'next/server'

import { COOKIE_SESSAO, criarSessao } from '@/lib/sessao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Troca o ID token (do login no navegador) por um session cookie httpOnly.
 *
 * POST /api/sessao  { idToken }
 */
export async function POST(request: Request) {
  let idToken = ''
  try {
    const corpo = await request.json()
    idToken = String(corpo?.idToken ?? '')
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (!idToken) {
    return NextResponse.json({ erro: 'Token ausente.' }, { status: 400 })
  }

  try {
    const cookie = await criarSessao(idToken)
    const resposta = NextResponse.json({ ok: true })
    resposta.cookies.set(COOKIE_SESSAO, cookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 5 * 24 * 60 * 60,
    })
    return resposta
  } catch {
    return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })
  }
}

/** Encerra a sessão (logout). */
export async function DELETE() {
  const resposta = NextResponse.json({ ok: true })
  resposta.cookies.set(COOKIE_SESSAO, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return resposta
}
