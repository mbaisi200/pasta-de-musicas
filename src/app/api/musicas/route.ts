import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getRepositorio } from '@/lib/repositorio'
import { zBoolean } from '@/lib/validacao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const corpoMusica = z.object({
  musica: z.string().trim().min(1, 'Informe o nome da música').max(50),
  autor: z.string().trim().max(50).default(''),
  grupo: z.string().trim().max(20).default(''),
  estilo: z.string().trim().max(20).default(''),
  instrumento: z.string().trim().max(20).default(''),
  observacao: z.string().trim().max(100).default(''),
  ordem: z.coerce.number().int().min(0).max(999).default(0),
  rolamento: zBoolean.default(false),
  velocidade: z.coerce.number().int().min(0).max(9).default(3),
})

export async function GET() {
  const musicas = await getRepositorio().listarMusicas()
  return NextResponse.json({ musicas })
}

export async function POST(request: Request) {
  let dados: unknown
  try {
    dados = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const validado = corpoMusica.safeParse(dados)
  if (!validado.success) {
    return NextResponse.json(
      { erro: 'Dados inválidos.', campos: z.flattenError(validado.error).fieldErrors },
      { status: 422 },
    )
  }

  const musica = await getRepositorio().criarMusica(validado.data)
  return NextResponse.json({ musica }, { status: 201 })
}
