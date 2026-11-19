'use client'

import * as React from 'react'
import { Fragment } from 'react'
import Link from 'next/link'
import {
  ArrowDownAZ,
  FileMusic,
  Filter,
  ListFilter,
  Mic,
  Music4,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { CapaSetList } from '@/components/capa/capa-setlist'
import {
  PastaDeMusicas,
  Pentagrama,
  Songbook,
} from '@/components/icones/musicais'
import { aparenciaDoInstrumento, corDoGrupo } from '@/lib/aparencia'
import {
  FILTROS_VAZIOS,
  ORDEM_CATALOGO,
  type Filtros,
  type Musica,
  type OrdemCatalogo,
} from '@/lib/types'
import { cn, normalizar } from '@/lib/utils'

interface CatalogoProps {
  musicas: Musica[]
}

/** Preferências do catálogo por dispositivo (ordem e agrupamento). */
const CHAVE_ORDEM = 'pasta-de-musicas:ordem-catalogo'
const CHAVE_SETLIST = 'pasta-de-musicas:setlist-ativo'
const EVENTO_PREFERENCIAS = 'pasta-de-musicas:preferencias-catalogo'

/**
 * Última música aberta — usada para voltar à mesma música na lista
 * (Solicitação: ao voltar da música, ficar nela em vez de ir para a 1ª).
 */
const CHAVE_MUSICA_ABERTA = 'pasta-de-musicas:musica-aberta'

function registrarMusicaAberta(id: string) {
  try {
    window.localStorage.setItem(CHAVE_MUSICA_ABERTA, id)
  } catch {
    /* modo privativo */
  }
}

function lerMusicaAberta(): string | null {
  try {
    return window.localStorage.getItem(CHAVE_MUSICA_ABERTA)
  } catch {
    return null
  }
}

/** A transcrição de voz costuma vir com ponto final — removemos a pontuação das bordas. */
function limparFala(texto: string): string {
  return texto
    .replace(/^[\s.,;:!?…]+|[\s.,;:!?…]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function assinarPreferencias(aoMudar: () => void) {
  if (typeof window === 'undefined') return () => undefined
  window.addEventListener('storage', aoMudar)
  window.addEventListener(EVENTO_PREFERENCIAS, aoMudar)
  return () => {
    window.removeEventListener('storage', aoMudar)
    window.removeEventListener(EVENTO_PREFERENCIAS, aoMudar)
  }
}

function lerPreferencias(): string {
  try {
    return `${window.localStorage.getItem(CHAVE_ORDEM) ?? ''}|${
      window.localStorage.getItem(CHAVE_SETLIST) ?? ''
    }`
  } catch {
    return '|'
  }
}

/** No servidor não existe localStorage: começa com os padrões. */
function lerPreferenciasNoServidor(): string {
  return '|'
}

function gravarPreferencia(chave: string, valor: string) {
  try {
    window.localStorage.setItem(chave, valor)
  } catch {
    /* modo privativo */
  }
  window.dispatchEvent(new Event(EVENTO_PREFERENCIAS))
}

function ordemValida(valor: string | undefined): OrdemCatalogo | null {
  return ORDEM_CATALOGO.some((opcao) => opcao.valor === valor)
    ? (valor as OrdemCatalogo)
    : null
}

/**
 * Lê a ordem e o agrupamento do `localStorage` sem perder a seleção quando o
 * usuário abre uma música e volta ao catálogo. O `useSyncExternalStore`
 * mantém a hidratação segura e sincroniza outras abas.
 */
function usePreferenciasCatalogo() {
  const bruto = React.useSyncExternalStore(
    assinarPreferencias,
    lerPreferencias,
    lerPreferenciasNoServidor,
  )
  const [ordemSalva, setlistSalvo] = bruto.split('|')
  const ordem = ordemValida(ordemSalva) ?? 'setlist'
  const agrupado = setlistSalvo === '' ? true : setlistSalvo !== '0'

  function mudarOrdem(valor: OrdemCatalogo) {
    gravarPreferencia(CHAVE_ORDEM, valor)
  }

  function alternarSetList() {
    gravarPreferencia(CHAVE_SETLIST, agrupado ? '0' : '1')
  }

  return { ordem, agrupado, mudarOrdem, alternarSetList }
}

/* ------------------------------------------------- tipos da Web Speech API */
interface ResultadoVoz {
  results?: { 0?: { 0?: { transcript?: string } } }
}
interface ReconhecimentoVoz {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((evento: ResultadoVoz) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}
type ConstrutorVoz = new () => ReconhecimentoVoz

function construtorDeVoz(): ConstrutorVoz | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: ConstrutorVoz
    webkitSpeechRecognition?: ConstrutorVoz
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function Catalogo({ musicas }: CatalogoProps) {
  const [filtros, setFiltros] = React.useState<Filtros>(FILTROS_VAZIOS)
  const { ordem, agrupado, mudarOrdem, alternarSetList } = usePreferenciasCatalogo()
  const [filtrosAbertos, setFiltrosAbertos] = React.useState(false)
  const [ouvindo, setOuvindo] = React.useState(false)

  /**
   * Solicitação: ao voltar de uma música, retornar à mesma música na lista
   * (em vez de voltar para o topo / 1ª música).
   */
  React.useEffect(() => {
    const id = lerMusicaAberta()
    if (!id) return
    const seletor = `[data-musica-id="${id.replace(/["\\]/g, '\\$&')}"]`
    const alvo = document.querySelector<HTMLElement>(seletor)
    if (!alvo) return
    window.requestAnimationFrame(() => {
      alvo.scrollIntoView({ block: 'center', behavior: 'auto' })
    })
  }, [])

  const valores = React.useMemo(() => {
    const conjuntos: Record<keyof Omit<Filtros, 'busca'>, Set<string>> = {
      grupo: new Set(),
      estilo: new Set(),
      autor: new Set(),
      instrumento: new Set(),
    }
    for (const m of musicas) {
      conjuntos.grupo.add(m.grupo)
      conjuntos.estilo.add(m.estilo)
      conjuntos.autor.add(m.autor)
      conjuntos.instrumento.add(m.instrumento)
    }
    return {
      grupo: [...conjuntos.grupo].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      estilo: [...conjuntos.estilo].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      autor: [...conjuntos.autor].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      instrumento: [...conjuntos.instrumento]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    }
  }, [musicas])

  const filtradas = React.useMemo(() => {
    const busca = normalizar(filtros.busca)
    const resultado = musicas.filter((m) => {
      if (filtros.grupo && m.grupo !== filtros.grupo) return false
      if (filtros.estilo && m.estilo !== filtros.estilo) return false
      if (filtros.autor && m.autor !== filtros.autor) return false
      if (filtros.instrumento && m.instrumento !== filtros.instrumento) return false
      if (!busca) return true
      const alvo = normalizar(
        [m.musica, m.autor, m.grupo, m.estilo, m.instrumento, m.observacao].join(' '),
      )
      return alvo.includes(busca)
    })

    const comparadores: Record<OrdemCatalogo, (a: Musica, b: Musica) => number> = {
      setlist: (a, b) =>
        a.grupo.localeCompare(b.grupo, 'pt-BR') || a.ordem - b.ordem ||
        a.musica.localeCompare(b.musica, 'pt-BR'),
      musica: (a, b) => a.musica.localeCompare(b.musica, 'pt-BR'),
      autor: (a, b) =>
        a.autor.localeCompare(b.autor, 'pt-BR') || a.musica.localeCompare(b.musica, 'pt-BR'),
      estilo: (a, b) =>
        a.estilo.localeCompare(b.estilo, 'pt-BR') || a.musica.localeCompare(b.musica, 'pt-BR'),
      instrumento: (a, b) =>
        a.instrumento.localeCompare(b.instrumento, 'pt-BR') || a.musica.localeCompare(b.musica, 'pt-BR'),
    }

    return [...resultado].sort(comparadores[ordem])
  }, [musicas, filtros, ordem])

  const grupos = React.useMemo(() => {
    const mapa = new Map<string, Musica[]>()
    for (const m of filtradas) {
      const chave = m.grupo || 'Sem SetList'
      const lista = mapa.get(chave)
      if (lista) lista.push(m)
      else mapa.set(chave, [m])
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [filtradas])

  const filtrosAtivos = React.useMemo(
    () =>
      (Object.keys(filtros) as (keyof Filtros)[]).filter(
        (chave) => chave !== 'busca' && filtros[chave],
      ).length,
    [filtros],
  )

  function limparFiltros() {
    setFiltros(FILTROS_VAZIOS)
  }

  /* ------------------------------------------------------- busca por voz */
  const reconhecimento = React.useRef<ReconhecimentoVoz | null>(null)

  function alternarVoz() {
    const Construtor = construtorDeVoz()
    if (!Construtor) {
      toast('Busca por voz não é suportada neste navegador.', { icon: '🎤' })
      return
    }

    if (ouvindo) {
      reconhecimento.current?.stop()
      setOuvindo(false)
      return
    }

    const rec = new Construtor()
    rec.lang = 'pt-BR'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (evento) => {
      const fala = evento.results?.[0]?.[0]?.transcript
      const limpa = fala ? limparFala(fala) : ''
      if (limpa) setFiltros((f) => ({ ...f, busca: limpa }))
    }
    rec.onend = () => setOuvindo(false)
    rec.onerror = () => setOuvindo(false)
    reconhecimento.current = rec
    rec.start()
    setOuvindo(true)
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-24 pt-4 sm:px-6 sm:pt-6">
      {/* Busca + filtros */}
      <div className="sticky top-14 z-30 -mx-3 mb-5 space-y-3 border-b border-border/70 bg-background/90 px-3 py-3 backdrop-blur-md sm:top-16 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filtros.busca}
              onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
              placeholder="Buscar por nome, autor, estilo..."
              className="pl-9 pr-20"
              aria-label="Buscar músicas"
              type="search"
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
              {filtros.busca && (
                <button
                  type="button"
                  onClick={() => setFiltros((f) => ({ ...f, busca: '' }))}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="size-4" />
                </button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={alternarVoz}
                    className={cn(
                      'rounded-md p-1.5 transition-colors hover:bg-accent',
                      ouvindo ? 'text-destructive' : 'text-muted-foreground hover:text-foreground',
                    )}
                    aria-label="Buscar por voz"
                  >
                    <Mic className={cn('size-4', ouvindo && 'animate-pulse')} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Buscar por voz</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <Sheet open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative size-11 shrink-0 md:hidden"
                aria-label="Abrir filtros"
              >
                <SlidersHorizontal className="size-5" />
                {filtrosAtivos > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {filtrosAtivos}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="grid gap-3 overflow-y-auto pb-2">
                <PainelFiltros
                  filtros={filtros}
                  valores={valores}
                  aoMudar={(patch) => setFiltros((f) => ({ ...f, ...patch }))}
                />
                <Button variant="outline" onClick={limparFiltros} disabled={filtrosAtivos === 0}>
                  <RotateCcw className="size-4" />
                  Limpar filtros
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Filtros inline (tablet e desktop) — não somem ao reduzir a tela */}
        <div className="hidden items-center gap-2 md:flex">
          <PainelFiltros
            filtros={filtros}
            valores={valores}
            aoMudar={(patch) => setFiltros((f) => ({ ...f, ...patch }))}
            compacto
          />
          {filtrosAtivos > 0 && (
            <Button variant="ghost" size="sm" onClick={limparFiltros}>
              <RotateCcw className="size-4" />
              Limpar
            </Button>
          )}
        </div>

        {/* Chips + ordenação */}
        <div className="flex flex-wrap items-center gap-2">
          {filtrosAtivos > 0 && (
            <>
              <Filter className="size-4 shrink-0 text-muted-foreground" />
              {(['grupo', 'estilo', 'autor', 'instrumento'] as const).map((chave) =>
                filtros[chave] ? (
                  <Badge key={chave} variant="secondary" className="gap-1 pr-1">
                    {filtros[chave]}
                    <button
                      type="button"
                      onClick={() => setFiltros((f) => ({ ...f, [chave]: '' }))}
                      className="rounded-full p-0.5 hover:bg-foreground/10"
                      aria-label={`Remover filtro ${chave}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ) : null,
              )}
            </>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={agrupado ? 'secondary' : 'ghost'}
                  size="sm"
                  aria-pressed={agrupado}
                  className={cn(
                    'h-9 gap-1.5 px-2.5 text-xs',
                    !agrupado && 'text-muted-foreground',
                  )}
                  onClick={alternarSetList}
                >
                  <ListFilter className="size-4" />
                  <span>{agrupado ? 'SetList ativo' : 'SetList inativo'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {agrupado
                  ? 'Desativar o agrupamento por SetList'
                  : 'Ativar o agrupamento por SetList'}
              </TooltipContent>
            </Tooltip>

            <Select value={ordem} onValueChange={(v) => mudarOrdem(v as OrdemCatalogo)}>
              <SelectTrigger
                className="h-9 w-auto max-w-[11rem] shrink-0 gap-1.5 border-none bg-transparent px-2 text-xs shadow-none"
                aria-label="Ordenar músicas"
              >
                <ArrowDownAZ className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {ORDEM_CATALOGO.find((opcao) => opcao.valor === ordem)?.rotulo ?? 'Ordenar'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {ORDEM_CATALOGO.map((opcao) => (
                  <SelectItem key={opcao.valor} value={opcao.valor}>
                    Ordenar por {opcao.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-sm text-muted-foreground">
          {filtradas.length === musicas.length
            ? `${musicas.length} ${musicas.length === 1 ? 'música' : 'músicas'}`
            : `${filtradas.length} de ${musicas.length} músicas`}
        </p>

        {/* Totais — apenas informação, em tamanho discreto e sem aparência de botão */}
        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <EstatisticaCompacta
            icone={Songbook}
            valor={String(new Set(musicas.map((m) => m.grupo).filter(Boolean)).size)}
            rotulo="setlists"
          />
          <EstatisticaCompacta
            icone={Pentagrama}
            valor={String(musicas.filter((m) => m.arquivo).length)}
            rotulo="com partitura"
          />
          <EstatisticaCompacta
            icone={PastaDeMusicas}
            valor={String(new Set(musicas.map((m) => m.estilo).filter(Boolean)).size)}
            rotulo="estilos"
          />
        </div>
      </div>

      {filtradas.length === 0 ? (
        <EstadoVazio temMusicas={musicas.length > 0} />
      ) : (
        <ListaMusicas grupos={agrupado ? grupos : [['', filtradas]]} mostrarGrupos={agrupado} />
      )}
    </div>
  )
}

function PainelFiltros({
  filtros,
  valores,
  aoMudar,
  compacto,
}: {
  filtros: Filtros
  valores: Record<'grupo' | 'estilo' | 'autor' | 'instrumento', string[]>
  aoMudar: (patch: Partial<Filtros>) => void
  compacto?: boolean
}) {
  const campos = [
    { chave: 'grupo' as const, rotulo: 'SetList', opcoes: valores.grupo },
    { chave: 'estilo' as const, rotulo: 'Estilo', opcoes: valores.estilo },
    { chave: 'autor' as const, rotulo: 'Autor', opcoes: valores.autor },
    { chave: 'instrumento' as const, rotulo: 'Instrumento', opcoes: valores.instrumento },
  ]

  return (
    <div
      className={cn(
        'grid gap-2',
        compacto ? 'min-w-0 flex-1 grid-cols-2 xl:grid-cols-4' : 'grid-cols-2',
      )}
    >
      {campos.map(({ chave, rotulo, opcoes }) => (
        <Select
          key={chave}
          value={filtros[chave] || '__todos__'}
          onValueChange={(v) => aoMudar({ [chave]: v === '__todos__' ? '' : v })}
        >
          <SelectTrigger className="h-10" aria-label={`Filtrar por ${rotulo}`}>
            <SelectValue placeholder={rotulo} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos — {rotulo}</SelectItem>
            {opcoes.map((opcao) => (
              <SelectItem key={opcao} value={opcao}>
                {opcao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
}

function ListaMusicas({
  grupos,
  mostrarGrupos,
}: {
  grupos: [string, Musica[]][]
  mostrarGrupos: boolean
}) {
  return (
    <>
      {/* Tabela — a partir de telas grandes (tablet deitado / desktop) */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="relative border-b border-border bg-muted/40 text-left">
              <th className="w-10 px-3 py-2.5" />
              <th className="px-3 py-2.5 font-semibold">Nome da música</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-semibold">SetList</th>
              <th className="px-3 py-2.5 text-center font-semibold">Ordem</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Estilo</th>
              <th className="px-3 py-2.5 font-semibold">Autor</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Instrumento</th>
              <th className="w-12 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {grupos.map(([grupo, itens]) => (
              <Fragment key={grupo || 'sem-grupo'}>
                {mostrarGrupos && (
                  <tr className="border-y border-border bg-muted/20">
                    <td colSpan={8} className="px-4 py-2">
                      <span className="flex items-center gap-2">
                        <Music4 className={cn('size-4', corDoGrupo(grupo).cor)} />
                        <span className="text-sm font-semibold uppercase tracking-wide">{grupo}</span>
                        <Badge variant="muted">{itens.length}</Badge>
                      </span>
                    </td>
                  </tr>
                )}
                {itens.map((m) => {
                  const aparencia = aparenciaDoInstrumento(m.instrumento)
                  const Icone = aparencia.icone
                  return (
                    <tr
                      key={m.id}
                      data-musica-id={m.id}
                      className="group border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40"
                    >
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            'grid size-8 place-items-center rounded-lg',
                            aparencia.corFundo,
                            aparencia.cor,
                          )}
                        >
                          <Icone className="size-4" />
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/musica/${m.id}`}
                          onClick={() => registrarMusicaAberta(m.id)}
                          className="font-medium transition-colors hover:text-primary"
                        >
                          {m.musica}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {m.grupo || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground tabular-nums">
                        {m.ordem}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {m.estilo || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{m.autor || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {m.instrumento || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button asChild variant="ghost" size="icon-sm">
                          <Link
                            href={`/musica/${m.id}`}
                            onClick={() => registrarMusicaAberta(m.id)}
                            aria-label={`Tocar ${m.musica}`}
                          >
                            <Play className="size-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cartões — celular (1 coluna) e tablet (2 colunas) */}
      <div className="space-y-6 sm:space-y-8 lg:hidden">
        {grupos.map(([grupo, itens]) => {
          return (
            <section key={grupo || 'sem-grupo'} className="space-y-2.5">
              {mostrarGrupos && (
                <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border/60 bg-card/50 px-3 py-2">
                  <span className="pointer-events-none absolute inset-0 pentagrama opacity-60" />
                  <CapaSetList nome={grupo} tamanho="sm" className="relative shadow-md" />
                  <div className="relative min-w-0">
                    <h2 className="truncate text-sm font-semibold uppercase tracking-wide">
                      {grupo}
                    </h2>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {itens.length === 1 ? '1 música' : `${itens.length} músicas`}
                    </p>
                  </div>
                </div>
              )}
              <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                {itens.map((m) => {
                  const aparencia = aparenciaDoInstrumento(m.instrumento)
                  const Icone = aparencia.icone
                  return (
                    <li key={m.id} data-musica-id={m.id} className="min-w-0">
                      <Link
                        href={`/musica/${m.id}`}
                        onClick={() => registrarMusicaAberta(m.id)}
                        className="group block h-full min-w-0 no-tap-highlight"
                      >
                        <Card className="vidro borda-gradiente cartao-vivo h-full overflow-hidden p-0 active:scale-[0.99]">
                          <div className="flex items-stretch gap-0">
                            {/* faixa com a cor do instrumento */}
                            <span
                              className={cn(
                                'w-1 shrink-0 transition-all duration-300 group-hover:w-1.5',
                                aparencia.corFundo,
                              )}
                            />
                            <div className="flex min-w-0 flex-1 items-center gap-3 p-3 sm:p-4">
                              <span
                                className={cn(
                                  'relative grid size-11 shrink-0 place-items-center rounded-xl ring-1 ring-inset ring-current/10 transition-transform duration-300 group-hover:scale-105',
                                  aparencia.corFundo,
                                  aparencia.cor,
                                )}
                              >
                                <Icone className="size-5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium leading-tight">
                                  {m.musica}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                  {[m.autor, m.instrumento].filter(Boolean).join(' · ') ||
                                    'Sem autor'}
                                </span>
                              </span>
                              <span
                                className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary opacity-0 transition-all duration-300 group-hover:opacity-100"
                                aria-hidden
                              >
                                <Play className="size-4" />
                              </span>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}

function EstatisticaCompacta({
  icone: Icone,
  valor,
  rotulo,
}: {
  icone: (props: { className?: string }) => React.ReactElement
  valor: string
  rotulo: string
}) {
  return (
    <span className="inline-flex items-center gap-1" title={`${valor} ${rotulo}`}>
      <Icone className="size-3.5 shrink-0 opacity-70" />
      <span className="font-medium tabular-nums text-foreground">{valor}</span>
      <span>{rotulo}</span>
    </span>
  )
}

function EstadoVazio({ temMusicas }: { temMusicas: boolean }) {
  return (
    <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <span className="pointer-events-none absolute inset-0 pentagrama opacity-50" />
      <span className="relative grid size-14 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
        {temMusicas ? (
          <Music4 className="size-7" />
        ) : (
          <FileMusic className="size-7" />
        )}
      </span>
      <div className="relative">
        <p className="font-medium">Nenhuma música encontrada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {temMusicas
            ? 'Ajuste a busca ou limpe os filtros para ver todas as músicas.'
            : 'Cadastre sua primeira música para começar a tocar.'}
        </p>
      </div>
      <div className="relative flex gap-2">
        {temMusicas ? (
          <Button variant="outline" asChild>
            <Link href="/">Ver todas</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/manutencao">Cadastrar música</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
