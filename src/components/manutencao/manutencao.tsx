'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import type { Musica } from '@/lib/types'
import { cn, normalizar } from '@/lib/utils'

interface ManutencaoProps {
  musicas: Musica[]
}

export function Manutencao({ musicas }: ManutencaoProps) {
  const router = useRouter()
  const [busca, setBusca] = React.useState('')
  const [editando, setEditando] = React.useState<Musica | null | undefined>(undefined)
  const [excluindo, setExcluindo] = React.useState<Musica | null>(null)
  const [processando, setProcessando] = React.useState(false)
  const [lista, setLista] = React.useState<Musica[]>(musicas)
  const [origem, setOrigem] = React.useState<Musica[]>(musicas)

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
        if (!envio.ok) {
          const erro = await envio.json().catch(() => null)
          toast.error(erro?.erro ?? 'Música salva, mas o PDF não foi enviado.')
        } else {
          musica = (await envio.json()).musica
          toast.success('Partitura enviada.')
        }
      }

      setLista((atual) =>
        editandoId
          ? atual.map((m) => (m.id === musica.id ? musica : m))
          : [...atual, musica],
      )
      setEditando(undefined)
      toast.success(editandoId ? 'Música atualizada.' : 'Música cadastrada.')
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
          <h1 className="text-xl font-semibold">Manutenção</h1>
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
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <ListMusic className="size-6" />
          </span>
          <div>
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
            <Button onClick={() => setEditando(null)}>
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
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wide">{nome}</h2>
                    <Badge variant="muted">{itens.length}</Badge>
                  </div>
                  <SortableContext
                    items={itens.map((m) => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-1.5">
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
        onOpenChange={(aberto) => !aberto && setEditando(undefined)}
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
              aoFechar={() => setEditando(undefined)}
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

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-xl border border-border bg-card p-2 sm:p-2.5',
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
