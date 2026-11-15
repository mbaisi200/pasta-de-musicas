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

  const usuario = await usuarioDaRequisicao()
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  return NextResponse.json({ usuario })
}
