import { NextResponse } from 'next/server'

import { getRepositorio } from '@/lib/repositorio'
import { exigirSessaoApi } from '@/lib/sessao'
import { TAMANHO_MAXIMO_PDF } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Contexto {
  params: Promise<{ id: string }>
}

/**
 * Recebe o PDF da partitura (multipart/form-data) e grava junto da música.
 *
 * No Firestore o arquivo vira base64 em `musicas/{id}/partitura/atual`
 * (limite de 1 MiB por documento → ~700 KB de PDF).
 */
export async function POST(request: Request, { params }: Contexto) {
  const sessao = await exigirSessaoApi()
  if (!sessao.ok) return sessao.resposta

  const { id } = await params
  const repositorio = getRepositorio()

  const musica = await repositorio.obterMusica(id)
  if (!musica) return NextResponse.json({ erro: 'Música não encontrada.' }, { status: 404 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ erro: 'Envie o arquivo no campo "arquivo".' }, { status: 400 })
  }

  const arquivo = form.get('arquivo')
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: 'Envie o arquivo no campo "arquivo".' }, { status: 400 })
  }
  if (arquivo.size === 0) {
    return NextResponse.json({ erro: 'O arquivo enviado está vazio.' }, { status: 400 })
  }
  if (arquivo.size > TAMANHO_MAXIMO_PDF) {
    return NextResponse.json(
      {
        erro: `PDF maior que ${Math.round(TAMANHO_MAXIMO_PDF / 1024)} KB. ` +
          'O limite vem do Firestore (1 MB por documento). Reduza o tamanho do PDF ' +
          '(imprimir em qualidade mais baixa ou usar "salvar como PDF" com menos imagens).',
      },
      { status: 413 },
    )
  }
  const nome = (arquivo.name || 'partitura.pdf').replace(/[^\w.\- ]+/g, '_')
  const buffer = Buffer.from(await arquivo.arrayBuffer())

  const gravado = await repositorio.salvarArquivo(id, {
    buffer,
    nome,
    tipo: arquivo.type || 'application/pdf',
  })

  const atualizada = await repositorio.atualizarMusica(id, { arquivo: gravado })
  return NextResponse.json({ musica: atualizada, arquivo: gravado })
}
