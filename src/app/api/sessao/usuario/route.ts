import { NextResponse } from 'next/server'

import { authIgnorado, usuarioDaRequisicao } from '@/lib/sessao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Dados do usuário da sessão atual (ou 401). */
export async function GET() {
  // Modo desenvolvimento (SKIP_AUTH=1) — devolve um usuário fictício para
  // que a interface (menu do usuário, logout) possa ser testada sem login.
  if (authIgnorado()) {
    return NextResponse.json({
      usuario: {
        uid: 'modo-desenvolvimento',
        email: 'dev@local',
        nome: 'Modo desenvolvimento',
        admin: true,
      },
    })
  }

  try {
    const usuario = await usuarioDaRequisicao()
    if (!usuario) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
    return NextResponse.json({ usuario })
  } catch (erro) {
    // Credencial do Firebase inválida (ex.: FIREBASE_PRIVATE_KEY errada na
    // Vercel) não deve virar 500: o front precisa saber que é configuração.
    return NextResponse.json(
      {
        erro: 'Falha ao validar a sessão — configuração do Firebase inválida.',
        detalhe: erro instanceof Error ? erro.message.slice(0, 200) : undefined,
        diagnostico: '/api/diagnostico',
      },
      { status: 401 },
    )
  }
}
