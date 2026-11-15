import { NextResponse } from 'next/server'

import { COOKIE_SESSAO, criarSessao, opcoesCookie } from '@/lib/sessao'
import { autenticar } from '@/lib/firebase/contas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Sessão do usuário.
 *
 * POST /api/sessao
 *   { email, senha }  → valida no servidor (Identity Toolkit admin) e devolve
 *                       um session cookie httpOnly
 *   { idToken }       → troca um ID token (login feito pelo Web SDK) por cookie
 *
 * DELETE /api/sessao  → encerra a sessão
 */
export async function POST(request: Request) {
  let corpo: { email?: string; senha?: string; idToken?: string } = {}
  try {
    corpo = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  let idToken = corpo.idToken ?? ''

  // Login feito pelo servidor (não depende do Web SDK no navegador)
  if (!idToken && corpo.email && corpo.senha) {
    try {
      idToken = await autenticar(corpo.email.trim().toLowerCase(), corpo.senha)
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Falha no login.'
      const amigavel = /PASSWORD_FIND_FAILED|CONTACT_ADMIN|INVALID_LOGIN/i.test(mensagem)
        ? 'E-mail ou senha incorretos.'
        : /CONFIGURATION_NOT_FOUND/i.test(mensagem)
          ? 'O Authentication ainda não foi ativado neste projeto do Firebase.'
          : mensagem
      return NextResponse.json({ erro: amigavel }, { status: 401 })
    }
  }

  if (!idToken) {
    return NextResponse.json({ erro: 'Informe e-mail e senha.' }, { status: 400 })
  }

  try {
    const cookie = await criarSessao(idToken)
    const resposta = NextResponse.json({ ok: true })
    resposta.cookies.set(COOKIE_SESSAO, cookie, opcoesCookie(request, 5 * 24 * 60 * 60))
    return resposta
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : ''
    if (/PRIVATE_KEY|credential|DECODER|PEM/i.test(mensagem)) {
      return NextResponse.json(
        {
          erro: 'Configuração do Firebase inválida no servidor (chave privada).',
          diagnostico: '/api/diagnostico',
        },
        { status: 503 },
      )
    }
    return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })
  }
}

/** Encerra a sessão (logout). */
export async function DELETE(request: Request) {
  const resposta = NextResponse.json({ ok: true })
  resposta.cookies.set(COOKIE_SESSAO, '', opcoesCookie(request, 0))
  return resposta
}
