'use client'

import * as React from 'react'
import Link from 'next/link'
import { History, Play, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { aparenciaDoInstrumento } from '@/lib/aparencia'
import type { Musica } from '@/lib/types'
import { cn } from '@/lib/utils'

const CHAVE = 'pasta-de-musicas:ultima'
const EVENTO = 'pasta-de-musicas:ultima:alterada'

/**
 * "Continuar de onde parou" — mostra a última música tocada neste
 * dispositivo, com a página salva.
 *
 * A posição fica no `localStorage` (por navegador), então cada aparelho
 * lembra o seu próprio ponto.
 */
export function ContinuarDeOndeParou({ musicas }: { musicas: Musica[] }) {
  const [ultima, setUltima] = React.useState<{ id: string; pagina: number } | null>(null)

  React.useEffect(() => {
    function ler() {
      try {
        const bruto = window.localStorage.getItem(CHAVE)
        if (!bruto) {
          setUltima(null)
          return
        }
        const dados = JSON.parse(bruto) as { id?: string; pagina?: number }
        if (!dados.id) {
          setUltima(null)
          return
        }
        setUltima({ id: dados.id, pagina: Number(dados.pagina) || 1 })
      } catch {
        setUltima(null)
      }
    }
    ler()
    // o player avisa quando salva uma nova posição (sem atraso)
    window.addEventListener(EVENTO, ler)
    window.addEventListener('storage', ler)
    window.addEventListener('focus', ler)
    return () => {
      window.removeEventListener(EVENTO, ler)
      window.removeEventListener('storage', ler)
      window.removeEventListener('focus', ler)
    }
  }, [])

  const musica = ultima ? musicas.find((m) => m.id === ultima.id) : null
  const pagina = ultima?.pagina ?? 1
  if (!musica) return null

  const aparencia = aparenciaDoInstrumento(musica.instrumento)
  const Icone = aparencia.icone

  return (
    <Card className="mb-4 flex items-center gap-3 border-primary/30 bg-primary/[0.06] p-3 sm:p-4">
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-xl',
          aparencia.corFundo,
          aparencia.cor,
        )}
      >
        <Icone className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
          <History className="size-3.5" />
          Continuar de onde parou
        </p>
        <p className="truncate font-medium leading-tight">{musica.musica}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[musica.autor, musica.instrumento].filter(Boolean).join(' · ')}
          {pagina > 1 && ` · página ${pagina}`}
        </p>
      </div>

      <Button asChild size="sm" className="shrink-0 gap-1.5">
        <Link href={`/musica/${musica.id}`}>
          <Play className="size-4" />
          <span className="hidden sm:inline">Retomar</span>
        </Link>
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        className="size-8 shrink-0"
        aria-label="Esconder"
        onClick={() => {
          window.localStorage.removeItem(CHAVE)
          setUltima(null)
        }}
      >
        <X className="size-4" />
      </Button>
    </Card>
  )
}

/** Salva a música e a página atuais (chamado pelo player). */
export function registrarUltimaMusica(id: string, pagina: number) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify({ id, pagina }))
    window.dispatchEvent(new Event(EVENTO))
  } catch {
    /* modo privativo */
  }
}
