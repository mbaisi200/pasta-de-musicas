'use client'

import * as React from 'react'
import { Download, Share2, Smartphone, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

/**
 * Banner de instalação da PWA + botão de compartilhamento (Web Share API).
 *
 * Aparece apenas quando o navegador sinaliza que o app pode ser instalado
 * (beforeinstallprompt) ou quando roda em iOS (que não expõe o evento).
 */

/** Detecta iOS/iPadOS — `useSyncExternalStore` evita divergência no SSR. */
function assinarIos(): () => void {
  return () => undefined
}

function detectarIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const agente = navigator.userAgent
  const iOS = /iphone|ipad|ipod/i.test(agente)
  const iPadOS = /Macintosh/.test(agente) && navigator.maxTouchPoints > 1
  return iOS || iPadOS
}

export function PromptInstalar() {
  const ios = React.useSyncExternalStore(assinarIos, detectarIos, () => false)
  const [deferred, setDeferred] = React.useState<{
    prompt: () => Promise<void>
  } | null>(null)
  const [visivel, setVisivel] = React.useState(false)
  const [fechado, setFechado] = React.useState(false)

  React.useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) return

    const aoInstalar = (e: Event) => {
      e.preventDefault()
      setDeferred(e as unknown as { prompt: () => Promise<void> })
      setVisivel(true)
    }
    window.addEventListener('beforeinstallprompt', aoInstalar)
    return () => window.removeEventListener('beforeinstallprompt', aoInstalar)
  }, [])

  async function instalar() {
    if (!deferred) {
      toast.info(
        'No iPhone/iPad use Compartilhar > "Adicionar à Tela de Início". No Android use o menu > "Instalar app".',
      )
      return
    }
    await deferred.prompt()
    setVisivel(false)
    setFechado(true)
    setDeferred(null)
  }

  async function compartilhar() {
    const dados = {
      title: 'Pasta de Músicas',
      text: 'Organize e toque suas partituras em qualquer dispositivo.',
      url: window.location.origin,
    }
    if (navigator.share) {
      try {
        await navigator.share(dados)
      } catch {
        /* cancelado */
      }
      return
    }
    try {
      await navigator.clipboard.writeText(dados.url)
      toast.success('Link copiado.')
    } catch {
      toast.error('Não foi possível compartilhar.')
    }
  }

  if ((!visivel && !ios) || fechado) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg p-3 pb-safe">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Smartphone className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Instale o app</p>
          <p className="text-xs text-muted-foreground">
            Tenha o repertório na tela de início, como no celular.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={compartilhar} aria-label="Compartilhar">
          <Share2 className="size-4" />
        </Button>
        <Button size="sm" onClick={instalar} className="gap-1.5">
          <Download className="size-4" />
          Instalar
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setFechado(true)}
          aria-label="Fechar aviso"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
