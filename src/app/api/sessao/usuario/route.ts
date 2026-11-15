import { NextResponse } from 'next/server'

import { usuarioDaRequisicao } from '@/lib/sessao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Dados do usuário da sessão atual (ou 401). */
export async function GET() {
  const usuario = await usuarioDaRequisicao()
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  return NextResponse.json({ usuario })
}
