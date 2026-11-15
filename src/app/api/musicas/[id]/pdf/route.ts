import { NextResponse } from 'next/server'

import { getRepositorio } from '@/lib/repositorio'
import { exigirSessaoApi } from '@/lib/sessao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Contexto {
  params: Promise<{ id: string }>
}

/**
 * Serve o PDF da partitura pela própria aplicação (mesma origem).
 *
 * O PDF.js (react-pdf) busca este endpoint — servindo pelo servidor evita
 * qualquer problema de CORS e permite cache privado.
 *
 * No Firestore o PDF fica em `musicas/{id}/partitura/atual` (base64);
 * no modo local, em `.data/arquivos/{id}/`.
 */
export async function GET(_request: Request, { params }: Contexto) {
  const sessao = await exigirSessaoApi()
  if (!sessao.ok) return sessao.resposta

  const { id } = await params
  const repositorio = getRepositorio()
  const musica = await repositorio.obterMusica(id)

  if (!musica?.arquivo) {
    return NextResponse.json({ erro: 'PDF não encontrado.' }, { status: 404 })
  }

  const arquivo = await repositorio.lerArquivo(id)
  if (!arquivo) {
    return NextResponse.json({ erro: 'Arquivo não encontrado.' }, { status: 404 })
  }

  return new Response(new Uint8Array(arquivo.buffer), {
    headers: {
      'Content-Type': arquivo.tipo || 'application/pdf',
      'Content-Length': String(arquivo.buffer.length),
      'Content-Disposition': `inline; filename="${encodeURIComponent(arquivo.nome)}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
