import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Player } from '@/components/player/player'
import { getRepositorio } from '@/lib/repositorio'
import { exigirUsuario } from '@/lib/sessao'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const musica = await getRepositorio().obterMusica(id)
  if (!musica) return { title: 'Música não encontrada' }
  return {
    title: musica.musica,
    description: [musica.autor, musica.instrumento].filter(Boolean).join(' · '),
  }
}

export default async function PaginaMusica({ params }: Props) {
  await exigirUsuario()

  const { id } = await params
  const repositorio = getRepositorio()
  const musica = await repositorio.obterMusica(id)
  if (!musica) notFound()

  // Sequência do SetList: mesma grupo, ordem acima e abaixo.
  const todas = await repositorio.listarMusicas()
  const irmas = todas
    .filter((m) => m.grupo === musica.grupo)
    .sort((a, b) => a.ordem - b.ordem || a.musica.localeCompare(b.musica, 'pt-BR'))
  const posicao = irmas.findIndex((m) => m.id === musica.id)
  const anterior = posicao > 0 ? irmas[posicao - 1] : null
  const proxima = posicao >= 0 && posicao < irmas.length - 1 ? irmas[posicao + 1] : null

  return (
    <Player
      musica={musica}
      anterior={anterior}
      proxima={proxima}
      posicaoNoSetList={posicao >= 0 ? posicao + 1 : 1}
      totalNoSetList={irmas.length}
      listaDoSetList={irmas}
    />
  )
}
