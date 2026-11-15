'use client'

import dynamic from 'next/dynamic'

import type { Musica } from '@/lib/types'

const VisualizadorPdf = dynamic(
  () => import('./visualizador-pdf').then((m) => m.VisualizadorPdf),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center p-10">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="text-sm">Carregando partitura…</p>
        </div>
      </div>
    ),
  },
)

interface PlayerProps {
  musica: Musica
  anterior: Musica | null
  proxima: Musica | null
  posicaoNoSetList: number
  totalNoSetList: number
  listaDoSetList: Musica[]
}

export function Player({
  musica,
  anterior,
  proxima,
  posicaoNoSetList,
  totalNoSetList,
  listaDoSetList,
}: PlayerProps) {
  return (
    <VisualizadorPdf
      musica={musica}
      anterior={anterior}
      proxima={proxima}
      posicaoNoSetList={posicaoNoSetList}
      totalNoSetList={totalNoSetList}
      listaDoSetList={listaDoSetList}
    />
  )
}
