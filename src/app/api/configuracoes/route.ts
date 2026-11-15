import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getRepositorio } from '@/lib/repositorio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const corpoConfig = z.object({
  ajuda: z.string().max(5000).optional(),
  mensagem: z.string().max(100).optional(),
  nome: z.string().max(30).optional(),
  email: z.string().max(100).optional(),
  versao: z.string().max(7).optional(),
  instrumentoPadrao: z.string().max(20).optional(),
  equipamento: z.enum(['micro', 'tablet', 'celular']).optional(),
})

export async function GET() {
  return NextResponse.json({ configuracoes: await getRepositorio().lerConfiguracoes() })
}

export async function PUT(request: Request) {
  let dados: unknown
  try {
    dados = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const validado = corpoConfig.safeParse(dados)
  if (!validado.success) {
    return NextResponse.json(
      { erro: 'Configuração inválida.', campos: z.flattenError(validado.error).fieldErrors },
      { status: 422 },
    )
  }

  const configuracoes = await getRepositorio().salvarConfiguracoes(validado.data)
  return NextResponse.json({ configuracoes })
}
