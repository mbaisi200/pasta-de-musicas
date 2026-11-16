'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  GripVertical,
  ListMusic,
  Music4,
  Loader2,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { FormMusica, type ValoresFormulario } from './form-musica'
import { aparenciaDoInstrumento } from '@/lib/aparencia'
import type { Musica } from '@/lib/types'
import { cn, normalizar } from '@/lib/utils'

interface ManutencaoProps {
  musicas: Musica[]
}

export function Manutencao({ musicas }: ManutencaoProps) {
  const router = useRouter()
  const parametros = useSearchParams()
  const [busca, setBusca] = React.useState('')
  // O player e o aviso de "sem partitura" abrem `/manutencao?id=…`; já
  // deixamos a música pronta para edição (inclusive para trocar o PDF).
  const [editando, setEditando] = React.useState<Musica | null | undefined>(() => {
    const id = parametros.get('id')
    if (!id) return undefined
    return musicas.find((m) => m.id === id) ?? undefined
  })
  const [excluindo, setExcluindo] = React.useState<Musica | null>(null)
  const [processando, setProcessando] = React.useState(false)
  const [lista, setLista] = React.useState<Musica[]>(musicas)
  const [origem, setOrigem] = React.useState<Musica[]>(musicas)

  /** Fecha o formulário e limpa o `?id=` para não reabrir ao recarregar. */
  function fecharFormulario() {
    setEditando(undefined)
    if (parametros.get('id')) router.replace('/manutencao', { scroll: false })
  }

  // Sincroniza a lista local quando chegamprops novas do servidor
  // (padrão do React para ajustar estado durante a renderização).
  if (origem !== musicas) {
    setOrigem(musicas)
    setLista(musicas)
  }

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const instrumentosSugeridos = React.useMemo(
    () => [...new Set(lista.map((m) => m.instrumento).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [lista],
  )

  const autoresSugeridos = React.useMemo(
    () => [...new Set(lista.map((m) => m.autor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [lista],
  )

  const filtradas = React.useMemo(() => {
    const termo = normalizar(busca)
    if (!termo) return lista
    return lista.filter((m) =>
      normalizar([m.musica, m.autor, m.grupo, m.estilo, m.instrumento].join(' ')).includes(termo),
    )
  }, [lista, busca])

  const grupos = React.useMemo(() => {
    const mapa = new Map<string, Musica[]>()
    for (const m of filtradas) {
      const chave = m.grupo || 'Sem SetList'
      const itens = mapa.get(chave)
      if (itens) itens.push(m)
      else mapa.set(chave, [m])
    }
    return [...mapa.entries()]
      .map(([nome, itens]) => [nome, [...itens].sort((a, b) => a.ordem - b.ordem)] as const)
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [filtradas])

  /* ------------------------------------------------------------- salvar */
  function aplicarNaLista(musica: Musica, editandoId: string | null) {
    setLista((atual) =>
      editandoId
        ? atual.map((m) => (m.id === musica.id ? musica : m))
        : [...atual, musica],
    )
  }

  async function salvar(valores: ValoresFormulario, arquivo: File | null) {
    setProcessando(true)
    try {
      const editandoId = editando && editando !== undefined ? editando.id : null
      const resposta = await fetch(
        editandoId ? `/api/musicas/${editandoId}` : '/api/musicas',
        {
          method: editandoId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(valores),
        },
      )

      const dados = await resposta.json()
      if (!resposta.ok) {
        toast.error(dados?.erro ?? 'Não foi possível salvar a música.')
        return
      }

      let musica: Musica = dados.musica

      if (arquivo) {
        const form = new FormData()
        form.append('arquivo', arquivo)
        const envio = await fetch(`/api/musicas/${musica.id}/arquivo`, {
          method: 'POST',
          body: form,
        })
        const retorno = await envio.json().catch(() => null)
        if (!envio.ok) {
          // Os dados já foram salvos; o PDF não. Mantém o formulário aberto
          // para o usuário tentar novamente sem perder o arquivo escolhido.
          aplicarNaLista(musica, editandoId)
          if (!editandoId) setEditando(musica)
          router.refresh()
          toast.error(
            retorno?.erro ??
              'Os dados foram salvos, mas a partitura não foi enviada. Tente novamente.',
          )
          return
        }
        musica = retorno.musica
      }

      aplicarNaLista(musica, editandoId)
      fecharFormulario()
      toast.success(
        arquivo
          ? editandoId
            ? 'Música e partitura atualizadas.'
            : 'Música cadastrada com a partitura.'
          : editandoId
            ? 'Música atualizada.'
            : 'Música cadastrada.',
      )
      router.refresh()
    } catch {
      toast.error('Falha de comunicação com o servidor.')
    } finally {
      setProcessando(false)
    }
  }

  /* ----------------------------------------------------------- excluir */
  async function excluir() {
    if (!excluindo) return
    setProcessando(true)
    try {
      const resposta = await fetch(`/api/musicas/${excluindo.id}`, { method: 'DELETE' })
      if (!resposta.ok) {
        toast.error('Não foi possível excluir.')
        return
      }
      setLista((atual) => atual.filter((m) => m.id !== excluindo.id))
      toast.success('Música excluída.')
      setExcluindo(null)
      router.refresh()
    } catch {
      toast.error('Falha de comunicação com o servidor.')
    } finally {
      setProcessando(false)
    }
  }

  /* --------------------------------------------------------- reordenar */
  /** Todas as músicas do grupo (sem o filtro de busca), em ordem. */
  function itensDoGrupo(nome: string): Musica[] {
    return lista
      .filter((m) => (m.grupo || 'Sem SetList') === nome)
      .sort((a, b) => a.ordem - b.ordem || a.musica.localeCompare(b.musica, 'pt-BR'))
  }

  async function reordenar(grupo: string, idOrigem: string, idDestino: string) {
    if (idOrigem === idDestino) return
    const itens = itensDoGrupo(grupo)
    const de = itens.findIndex((m) => m.id === idOrigem)
    const para = itens.findIndex((m) => m.id === idDestino)
    if (de < 0 || para < 0) return

    const novaLista = arrayMove(itens, de, para).map((m, indice) => ({
      ...m,
      ordem: indice + 1,
    }))
    const anteriores = new Map(itens.map((m, i) => [m.id, i + 1]))

    // Atualiza localmente para a interface responder na hora
    setLista((atual) =>
      atual.map((m) => {
        const nova = novaLista.find((n) => n.id === m.id)
        return nova ?? m
      }),
    )

    try {
      await Promise.all(
        novaLista.map(async (m, indice) => {
          if (anteriores.get(m.id) === indice + 1) return
          await fetch(`/api/musicas/${m.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ordem: indice + 1 }),
          })
        }),
      )
      router.refresh()
    } catch {
      toast.error('Não foi possível salvar a nova ordem.')
    }
  }

  /** Move a música uma posição para cima/para baixo dentro do SetList. */
  function mover(id: string, direcao: 1 | -1, grupo: string) {
    const itens = itensDoGrupo(grupo)
    const indice = itens.findIndex((m) => m.id === id)
    const vizinho = itens[indice + direcao]
    if (!vizinho) return
    reordenar(grupo, id, vizinho.id)
  }

  function aoEncerrarArraste(evento: DragEndEvent) {
    const { active, over } = evento
    if (!over || active.id === over.id) return
    const grupo = grupos.find(([, itens]) => itens.some((m) => m.id === active.id))
    if (!grupo) return
    reordenar(grupo[0], String(active.id), String(over.id))
  }

  const totalArquivos = lista.filter((m) => m.arquivo).length

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-24 pt-4 sm:px-6 sm:pt-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Music4 className="size-5 text-primary" />
            Manutenção
          </h1>
          <p className="text-sm text-muted-foreground">
            {lista.length} {lista.length === 1 ? 'música' : 'músicas'} ·{' '}
            {totalArquivos} com partitura
          </p>
        </div>
        <Button className="ml-auto gap-2" onClick={() => setEditando(null)}>
          <Plus className="size-4" />
          Nova música
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar na manutenção..."
          className="pl-9"
          aria-label="Buscar músicas"
        />
      </div>

      {grupos.length === 0 ? (
        <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <span className="pointer-events-none absolute inset-0 pentagrama opacity-50" />
          <span className="relative grid size-14 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
            <ListMusic className="size-7" />
          </span>
          <div className="relative">
            <p className="font-medium">
              {lista.length === 0 ? 'Nenhuma música cadastrada' : 'Nada encontrado'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {lista.length === 0
                ? 'Cadastre a primeira música e envie a partitura em PDF.'
                : 'Ajuste a busca para ver outras músicas.'}
            </p>
          </div>
          {lista.length === 0 && (
            <Button className="relative" onClick={() => setEditando(null)}>
              <Plus className="size-4" />
              Cadastrar música
            </Button>
          )}
        </div>
      ) : (
        <DndContext
          id="manutencao-setlist"
          sensors={sensores}
          collisionDetection={closestCenter}
          onDragEnd={aoEncerrarArraste}
        >
          <div className="space-y-5">
            {grupos.map(([nome, itens]) => {
              const completo = itensDoGrupo(nome)
              return (
                <section key={nome} className="space-y-2">
                  <div className="relative flex items-center gap-2 overflow-hidden rounded-lg border border-border/60 bg-muted/25 px-2.5 py-1.5">
                    <span className="pointer-events-none absolute inset-0 pentagrama opacity-70" />
                    <Music4 className="relative size-4 text-primary" />
                    <h2 className="relative text-sm font-semibold uppercase tracking-wide">{nome}</h2>
                    <Badge variant="muted" className="relative">
                      {itens.length}
                    </Badge>
                  </div>
                  <SortableContext
                    items={itens.map((m) => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
                      {itens.map((m) => (
                        <ItemOrdenavel
                          key={m.id}
                          musica={m}
                          primeiro={completo[0]?.id === m.id}
                          ultimo={completo[completo.length - 1]?.id === m.id}
                          aoEditar={() => setEditando(m)}
                          aoExcluir={() => setExcluindo(m)}
                          aoMover={(direcao) => mover(m.id, direcao, nome)}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </section>
              )
            })}
          </div>
        </DndContext>
      )}

      {/* Formulário */}
      <Dialog
        open={editando !== undefined}
        onOpenChange={(aberto) => !aberto && fecharFormulario()}
      >
        <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar música' : 'Nova música'}</DialogTitle>
            <DialogDescription>
              {editando
                ? 'Altere os dados e salve. O PDF pode ser trocado a qualquer momento.'
                : 'Preencha os dados da partitura e envie o PDF.'}
            </DialogDescription>
          </DialogHeader>
          {editando !== undefined && (
            <FormMusica
              musica={editando}
              aoSalvar={salvar}
              aoFechar={fecharFormulario}
              instrumentosSugeridos={instrumentosSugeridos}
              autoresSugeridos={autoresSugeridos}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={Boolean(excluindo)} onOpenChange={(aberto) => !aberto && setExcluindo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Excluir música?
            </DialogTitle>
            <DialogDescription>
              {excluindo?.musica} será removida em definitivo, junto com a partitura em PDF.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluindo(null)} disabled={processando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={excluir} disabled={processando} className="gap-2">
              {processando && <Loader2 className="size-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ItemOrdenavel({
  musica,
  primeiro,
  ultimo,
  aoEditar,
  aoExcluir,
  aoMover,
}: {
  musica: Musica
  primeiro: boolean
  ultimo: boolean
  aoEditar: () => void
  aoExcluir: () => void
  aoMover: (direcao: 1 | -1) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: musica.id,
  })

  const aparencia = aparenciaDoInstrumento(musica.instrumento)
  const Icone = aparencia.icone

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-xl border border-border bg-card p-2 sm:p-2.5',
        isDragging && 'z-10 shadow-lg',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent active:cursor-grabbing"
        aria-label={`Reordenar ${musica.musica}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-lg',
          aparencia.corFundo,
          aparencia.cor,
        )}
        aria-hidden
      >
        <Icone className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={`/musica/${musica.id}`}
          className="block truncate text-sm font-medium leading-tight hover:text-primary md:pointer-events-none md:text-inherit"
          title="Abrir partitura"
        >
          {musica.musica}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {[musica.autor, musica.instrumento].filter(Boolean).join(' · ') || 'Sem autor'}
          {!musica.arquivo && <span className="ml-1 text-destructive">· sem PDF</span>}
        </p>
      </div>

      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
        {musica.ordem}
      </span>

      <div className="flex shrink-0 items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8"
              disabled={primeiro}
              onClick={() => aoMover(-1)}
              aria-label="Mover para cima"
            >
              <ArrowUp className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mover para cima</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8"
              disabled={ultimo}
              onClick={() => aoMover(1)}
              aria-label="Mover para baixo"
            >
              <ArrowDown className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mover para baixo</TooltipContent>
        </Tooltip>

        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="hidden size-8 md:inline-flex"
          aria-label="Tocar"
        >
          <Link href={`/musica/${musica.id}`}>
            <Play className="size-4" />
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8"
          onClick={aoEditar}
          aria-label={`Editar ${musica.musica}`}
        >
          <Pencil className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8 text-destructive hover:text-destructive"
          onClick={aoExcluir}
          aria-label={`Excluir ${musica.musica}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  )
}
