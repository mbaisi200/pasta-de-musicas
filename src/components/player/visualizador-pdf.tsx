'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileWarning,
  Gauge,
  Maximize2,
  Minimize,
  Pause,
  Pencil,
  Play,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { VELOCIDADE_MAX, VELOCIDADE_MIN, type Musica } from '@/lib/types'
import { cn } from '@/lib/utils'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf/pdf.worker.min.mjs'

/** Pixels por segundo da rolagem automática em cada nível de velocidade. */
const PX_POR_SEGUNDO = (velocidade: number) => 8 + velocidade * 11

interface VisualizadorPdfProps {
  musica: Musica
  anterior: Musica | null
  proxima: Musica | null
}

export function VisualizadorPdf({ musica, anterior, proxima }: VisualizadorPdfProps) {
  const router = useRouter()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const areaRef = React.useRef<HTMLDivElement>(null)
  const paginasRef = React.useRef<(HTMLDivElement | null)[]>([])

  const [numPaginas, setNumPaginas] = React.useState(0)
  const [paginaAtual, setPaginaAtual] = React.useState(1)
  const [zoom, setZoom] = React.useState(1)
  const [rolando, setRolando] = React.useState(false)
  const [velocidade, setVelocidade] = React.useState(musica.velocidade || 3)
  const [carregando, setCarregando] = React.useState(true)
  const [erro, setErro] = React.useState<string | null>(null)
  const [telaCheia, setTelaCheia] = React.useState(false)
  const [larguraArea, setLarguraArea] = React.useState(0)

  const chavePosicao = `pasta-de-musicas:posicao:${musica.id}`

  /* ---------------------------------------------------------- layout */
  React.useEffect(() => {
    const alvo = areaRef.current
    if (!alvo) return
    const observer = new ResizeObserver(([entrada]) => {
      setLarguraArea(entrada.contentRect.width)
    })
    observer.observe(alvo)
    return () => observer.disconnect()
  }, [])

  /* ------------------------------------------------- largura da página */
  const larguraPagina = React.useMemo(() => {
    if (!larguraArea) return 0
    const disponivel = Math.min(larguraArea - 24, 920)
    return Math.max(240, Math.round(disponivel * zoom))
  }, [larguraArea, zoom])

  /* ------------------------------------------- posição salva (retomar) */
  React.useEffect(() => {
    if (!numPaginas || !containerRef.current) return
    const salvo = window.localStorage.getItem(chavePosicao)
    if (!salvo) return
    const pagina = Number(salvo)
    if (!pagina || pagina < 1 || pagina > numPaginas) return
    window.requestAnimationFrame(() => irParaPagina(pagina, 'auto'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPaginas])

  function salvarPosicao(pagina: number) {
    try {
      window.localStorage.setItem(chavePosicao, String(pagina))
    } catch {
      /* ignora */
    }
  }

  /* ---------------------------------------------- rolagem automática */
  React.useEffect(() => {
    if (!rolando) return
    let raf = 0
    let ultimo = performance.now()
    // O Chrome trunca `scrollTop` fracionário para inteiro: acumulamos a
    // posição em ponto flutuante e escrevemos apenas pixels inteiros.
    let posicao = containerRef.current?.scrollTop ?? 0

    const passo = (agora: number) => {
      const dt = Math.min((agora - ultimo) / 1000, 0.1)
      ultimo = agora
      const el = containerRef.current
      if (!el) return

      const maximo = Math.max(el.scrollHeight - el.clientHeight, 0)
      posicao = Math.min(posicao + PX_POR_SEGUNDO(velocidade) * dt, maximo)

      const alvo = Math.round(posicao)
      if (alvo !== el.scrollTop) el.scrollTop = alvo

      if (posicao >= maximo - 0.5) {
        el.scrollTop = maximo
        setRolando(false)
        return
      }

      raf = window.requestAnimationFrame(passo)
    }

    raf = window.requestAnimationFrame(passo)
    return () => window.cancelAnimationFrame(raf)
  }, [rolando, velocidade])

  /* ------------------------------------------------- tela ligada (wake lock) */
  React.useEffect(() => {
    let wl: { release: () => Promise<void> } | null = null
    let cancelado = false

    async function travar() {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (tipo: string) => Promise<{ release: () => Promise<void> }> }
      }
      if (!nav.wakeLock) return
      try {
        wl = await nav.wakeLock.request('screen')
      } catch {
        /* bloqueado pelo navegador — sem waking lock */
      }
    }

    if (rolando) travar()
    return () => {
      cancelado = true
      if (cancelado && wl) wl.release().catch(() => undefined)
    }
  }, [rolando])

  /* ------------------------------- salvar rolamento/velocidade no servidor */
  const salvarTimer = React.useRef<number | null>(null)
  function persistir(estado: { rolamento?: boolean; velocidade?: number }) {
    if (salvarTimer.current) window.clearTimeout(salvarTimer.current)
    salvarTimer.current = window.setTimeout(() => {
      fetch(`/api/musicas/${musica.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estado),
      }).catch(() => undefined)
    }, 700)
  }

  function alternarRolamento() {
    setRolando((v) => {
      const novo = !v
      persistir({ rolamento: novo })
      return novo
    })
  }

  function mudarVelocidade(valor: number) {
    const novo = Math.min(VELOCIDADE_MAX, Math.max(VELOCIDADE_MIN, valor))
    setVelocidade(novo)
    persistir({ velocidade: novo })
  }

  /* --------------------------------------------------- navegação de página */
  function irParaPagina(pagina: number, comportamento: ScrollBehavior = 'smooth') {
    const alvo = paginasRef.current[pagina - 1]
    const container = containerRef.current
    if (!alvo || !container) return
    const topo = alvo.offsetTop - container.offsetTop - 8
    container.scrollTo({ top: topo, behavior: comportamento })
    setPaginaAtual(pagina)
    salvarPosicao(pagina)
  }

  const proximaPagina = React.useCallback(() => {
    irParaPagina(Math.min(paginaAtual + 1, numPaginas || 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaAtual, numPaginas])

  const paginaAnterior = React.useCallback(() => {
    irParaPagina(Math.max(paginaAtual - 1, 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaAtual])

  /* ----------------------------------------------- página atual (observer) */
  React.useEffect(() => {
    const container = containerRef.current
    if (!container || !numPaginas) return
    const observer = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visivel) return
        const indice = paginasRef.current.findIndex((el) => el === visivel.target)
        if (indice >= 0) {
          setPaginaAtual(indice + 1)
          salvarPosicao(indice + 1)
        }
      },
      { root: container, threshold: [0.2, 0.5, 0.9] },
    )
    paginasRef.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPaginas, larguraPagina])

  /* --------------------------------------------------------- atalhos */
  React.useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement
      if (alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)) return
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        alternarRolamento()
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        proximaPagina()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        paginaAnterior()
      } else if (e.key === '+' || e.key === '=') {
        mudarVelocidade(velocidade + 1)
      } else if (e.key === '-' || e.key === '_') {
        mudarVelocidade(velocidade - 1)
      } else if (e.key === 'Escape') {
        setRolando(false)
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  })

  /* ------------------------------------------- gesto de arrastar (swipe) */
  const toque = React.useRef<{ x: number; y: number } | null>(null)

  function aoTocar(e: React.TouchEvent) {
    const t = e.touches[0]
    toque.current = { x: t.clientX, y: t.clientY }
  }

  function aoSoltar(e: React.TouchEvent) {
    if (!toque.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - toque.current.x
    const dy = t.clientY - toque.current.y
    toque.current = null
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      if (dx < 0) proximaPagina()
      else paginaAnterior()
    }
  }

  /* ------------------------------------------------------ tela cheia */
  React.useEffect(() => {
    const aoMudar = () => setTelaCheia(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', aoMudar)
    return () => document.removeEventListener('fullscreenchange', aoMudar)
  }, [])

  async function alternarTelaCheia() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      toast.error('Tela cheia indisponível neste navegador.')
    }
  }

  /* ---------------------------------------------------------- estados */
  const urlPdf = `/api/musicas/${musica.id}/pdf`

  if (!musica.arquivo) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
            <FileWarning className="size-7" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">{musica.musica}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta música ainda não tem partitura (PDF) cadastrada.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href={`/manutencao?id=${musica.id}`}>
                <Pencil className="size-4" />
                Cadastrar partitura
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="size-4" />
                Voltar ao catálogo
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('flex h-dvh flex-col bg-background', telaCheia && 'bg-black')}>
      {/* Barra superior */}
      <div className="flex items-center gap-2 border-b border-border bg-card/80 px-2 py-2 pt-safe backdrop-blur sm:px-4">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar ao catálogo">
          <Link href="/">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight sm:text-base">
            {musica.musica}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {[musica.autor, musica.instrumento].filter(Boolean).join(' · ') || 'Sem autor'}
          </p>
        </div>

        {musica.grupo && (
          <Badge variant="default" className="hidden shrink-0 sm:inline-flex">
            {musica.grupo}
          </Badge>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hidden size-9 sm:inline-flex"
              aria-label="Abrir PDF em nova aba"
              onClick={() => window.open(urlPdf, '_blank', 'noopener')}
            >
              <ExternalLink className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Abrir PDF em nova aba</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="icon" className="size-9" aria-label="Editar música">
              <Link href={`/manutencao?id=${musica.id}`}>
                <Pencil className="size-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Editar música</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              aria-label={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
              onClick={alternarTelaCheia}
            >
              {telaCheia ? <Minimize className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}</TooltipContent>
        </Tooltip>
      </div>

      {/* Área da partitura */}
      <div
        ref={areaRef}
        className="relative flex-1 overflow-hidden bg-partitura"
        onTouchStart={aoTocar}
        onTouchEnd={aoSoltar}
      >
        <div
          ref={containerRef}
          className="h-full overflow-y-auto overscroll-contain scrollbar-thin"
          onWheel={() => {
            if (rolando) setRolando(false)
          }}
          onTouchMove={() => {
            if (rolando) setRolando(false)
          }}
        >
          <div className="mx-auto flex w-full flex-col items-center gap-3 px-3 py-4">
            <Document
              file={urlPdf}
              onLoadSuccess={({ numPages: total }) => {
                setNumPaginas(total)
                setCarregando(false)
              }}
              onLoadError={(e) => {
                setErro(e.message || 'Não foi possível carregar o PDF.')
                setCarregando(false)
              }}
              loading={
                <div className="grid place-items-center py-20 text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    <p className="text-sm">Carregando partitura…</p>
                  </div>
                </div>
              }
              error={
                <div className="grid place-items-center py-20 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileWarning className="size-8" />
                    <p className="text-sm">{erro ?? 'Erro ao abrir o PDF.'}</p>
                  </div>
                </div>
              }
            >
              {Array.from({ length: numPaginas }, (_, i) => i + 1).map((n) => (
                <div
                  key={n}
                  ref={(el) => {
                    paginasRef.current[n - 1] = el
                  }}
                  className="w-full"
                >
                  <Page
                    pageNumber={n}
                    width={larguraPagina || undefined}
                    className="overflow-hidden rounded-sm shadow-lg"
                    loading={
                      <div className="grid aspect-[1/1.414] w-full place-items-center bg-white/90 text-zinc-500">
                        <div className="size-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                      </div>
                    }
                  />
                </div>
              ))}
            </Document>
          </div>
        </div>

        {carregando && numPaginas === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="border-t border-border bg-card/90 px-2 pb-safe pt-2 backdrop-blur sm:px-4">
        <div className="mx-auto flex max-w-4xl items-center gap-1.5 sm:gap-2">
          {/* Sequência do SetList */}
          <Button
            variant="ghost"
            size="icon"
            className="size-10 shrink-0"
            disabled={!anterior}
            onClick={() => anterior && router.push(`/musica/${anterior.id}`)}
            aria-label="Música anterior do SetList"
            title={anterior ? `Anterior: ${anterior.musica}` : undefined}
          >
            <SkipBack className="size-5" />
          </Button>

          {/* Rolagem */}
          <Button
            size="icon"
            variant={rolando ? 'default' : 'secondary'}
            className="size-12 shrink-0 rounded-full"
            onClick={alternarRolamento}
            aria-label={rolando ? 'Parar rolagem' : 'Iniciar rolagem automática'}
          >
            {rolando ? <Pause className="size-5" /> : <Play className="size-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-10 shrink-0"
            disabled={!proxima}
            onClick={() => proxima && router.push(`/musica/${proxima.id}`)}
            aria-label="Próxima música do SetList"
            title={proxima ? `Próxima: ${proxima.musica}` : undefined}
          >
            <SkipForward className="size-5" />
          </Button>

          {/* Velocidade */}
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-1.5 py-1">
            <Gauge className="size-4 text-muted-foreground" />
            <Slider
              value={[velocidade]}
              min={VELOCIDADE_MIN}
              max={VELOCIDADE_MAX}
              step={1}
              onValueChange={([v]) => mudarVelocidade(v)}
              className="w-16 sm:w-28"
              aria-label="Velocidade da rolagem"
            />
            <span className="w-4 text-center text-sm font-semibold tabular-nums">{velocidade}</span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
              aria-label="Diminuir zoom"
            >
              <ZoomOut className="size-5" />
            </Button>
            <span className="w-11 text-center text-xs font-medium tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
              aria-label="Aumentar zoom"
            >
              <ZoomIn className="size-5" />
            </Button>

            <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              onClick={paginaAnterior}
              disabled={paginaAtual <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <span className="min-w-14 text-center text-sm font-medium tabular-nums">
              {paginaAtual}
              <span className="text-muted-foreground">/{numPaginas || '—'}</span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              onClick={proximaPagina}
              disabled={paginaAtual >= (numPaginas || 1)}
              aria-label="Próxima página"
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </div>

        {/* Observação da música */}
        {musica.observacao && (
          <p className="mx-auto mt-2 max-w-4xl truncate text-center text-xs text-muted-foreground">
            {musica.observacao}
          </p>
        )}
      </div>

      {/* Atalho: som do metrônomo/aviso de rolagem */}
      <div className="sr-only" aria-live="polite">
        {rolando ? 'Rolagem automática ligada' : 'Rolagem automática parada'}
      </div>
    </div>
  )
}
