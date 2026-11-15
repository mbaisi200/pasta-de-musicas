import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getRepositorio } from '@/lib/repositorio'
import { zBoolean } from '@/lib/validacao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Contexto {
  params: Promise<{ id: string }>
}

const parcialMusica = z
  .object({
    musica: z.string().trim().min(1).max(50).optional(),
    autor: z.string().trim().max(50).optional(),
    grupo: z.string().trim().max(20).optional(),
    estilo: z.string().trim().max(20).optional(),
    instrumento: z.string().trim().max(20).optional(),
    observacao: z.string().trim().max(100).optional(),
    ordem: z.coerce.number().int().min(0).max(999).optional(),
    rolamento: zBoolean.optional(),
    velocidade: z.coerce.number().int().min(0).max(9).optional(),
  })
  .partial()

export async function GET(_request: Request, { params }: Contexto) {
  const { id } = await params
  const musica = await getRepositorio().obterMusica(id)
  if (!musica) return NextResponse.json({ erro: 'Música não encontrada.' }, { status: 404 })
  return NextResponse.json({ musica })
}

export async function PATCH(request: Request, { params }: Contexto) {
  const { id } = await params
  let dados: unknown
  try {
    dados = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const validado = parcialMusica.safeParse(dados)
  if (!validado.success) {
    return NextResponse.json(
      { erro: 'Dados inválidos.', campos: z.flattenError(validado.error).fieldErrors },
      { status: 422 },
    )
  }

  try {
    const musica = await getRepositorio().atualizarMusica(id, validado.data)
    return NextResponse.json({ musica })
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : 'Falha ao atualizar.' },
      { status: 404 },
    )
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id } = await params
  try {
    await getRepositorio().excluirMusica(id)
    return NextResponse.json({ ok: true })
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : 'Falha ao excluir.' },
      { status: 404 },
    )
  }
}
