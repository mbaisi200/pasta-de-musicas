'use client'

import * as React from 'react'
import { FileSearch, FileUp, Loader2, Paperclip, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { analisarPartituraNoNavegador } from '@/lib/pdf/analisar-cliente'
import { VELOCIDADE_MAX, VELOCIDADE_MIN, TAMANHO_MAXIMO_PDF, type Musica } from '@/lib/types'
import { formatarBytes } from '@/lib/utils'

export interface ValoresFormulario {
  musica: string
  autor: string
  grupo: string
  estilo: string
  instrumento: string
  observacao: string
  ordem: number
  rolamento: boolean
  velocidade: number
}

export function valoresIniciais(musica?: Musica | null): ValoresFormulario {
  return {
    musica: musica?.musica ?? '',
    autor: musica?.autor ?? '',
    grupo: musica?.grupo ?? '',
    estilo: musica?.estilo ?? '',
    instrumento: musica?.instrumento ?? '',
    observacao: musica?.observacao ?? '',
    ordem: musica?.ordem ?? 1,
    rolamento: musica?.rolamento ?? false,
    velocidade: musica?.velocidade ?? 3,
  }
}

interface FormMusicaProps {
  musica: Musica | null
  aoSalvar: (valores: ValoresFormulario, arquivo: File | null) => Promise<void>
  aoFechar: () => void
  instrumentosSugeridos: string[]
  autoresSugeridos: string[]
}

export function FormMusica({
  musica,
  aoSalvar,
  aoFechar,
  instrumentosSugeridos,
  autoresSugeridos,
}: FormMusicaProps) {
  const [valores, setValores] = React.useState<ValoresFormulario>(() => valoresIniciais(musica))
  const [arquivo, setArquivo] = React.useState<File | null>(null)
  const [salvando, setSalvando] = React.useState(false)
  const [analisando, setAnalisando] = React.useState(false)
  const [analise, setAnalise] = React.useState<{
    titulo: string
    autor: string
    instrumento: string
    estilo: string
    paginas: number
  } | null>(null)
  const inputArquivo = React.useRef<HTMLInputElement>(null)

  function alterar<C extends keyof ValoresFormulario>(campo: C, valor: ValoresFormulario[C]) {
    setValores((v) => ({ ...v, [campo]: valor }))
  }

  /** Lê o PDF no navegador e sugere os campos (só preenche os vazios). */
  async function analisar(arquivo: File) {
    setAnalisando(true)
    try {
      const resultado = await analisarPartituraNoNavegador(arquivo)
      setAnalise(resultado)

      const sugestoes = [
        ['musica', resultado.titulo],
        ['autor', resultado.autor],
        ['instrumento', resultado.instrumento],
        ['estilo', resultado.estilo],
      ].filter(([, valor]) => Boolean(valor)) as [keyof ValoresFormulario, string][]

      if (sugestoes.length === 0) {
        toast.info('Não consegui ler o texto deste PDF — preencha os campos à mão.')
        return
      }

      setValores((atuais) => {
        const copia: ValoresFormulario = { ...atuais }
        for (const [campo, valor] of sugestoes) {
          if (!copia[campo]) copia[campo] = valor as never
        }
        return copia
      })

      toast.success('Partitura analisada — confira os campos.')
    } catch {
      toast.error('Não foi possível analisar este PDF.')
    } finally {
      setAnalisando(false)
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!valores.musica.trim()) {
      toast.error('Informe o nome da música.')
      return
    }
    setSalvando(true)
    try {
      await aoSalvar(valores, arquivo)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="campo-musica">Nome da música *</Label>
        <Input
          id="campo-musica"
          value={valores.musica}
          onChange={(e) => alterar('musica', e.target.value)}
          placeholder="Ex.: Misty"
          maxLength={50}
          required
          autoFocus
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="campo-autor">Autor(es)</Label>
          <Input
            id="campo-autor"
            value={valores.autor}
            onChange={(e) => alterar('autor', e.target.value)}
            placeholder="Ex.: Erroll Garner"
            maxLength={50}
            list="sugestoes-autor"
          />
          <datalist id="sugestoes-autor">
            {autoresSugeridos.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="campo-grupo">SetList (repertório)</Label>
          <Input
            id="campo-grupo"
            value={valores.grupo}
            onChange={(e) => alterar('grupo', e.target.value)}
            placeholder="Ex.: G-005"
            maxLength={20}
          />
          <p className="text-xs text-muted-foreground">
            Agrupa as músicas que você toca em sequência.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="campo-estilo">Estilo</Label>
          <Input
            id="campo-estilo"
            value={valores.estilo}
            onChange={(e) => alterar('estilo', e.target.value)}
            placeholder="Ex.: Jazz Standard"
            maxLength={20}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="campo-instrumento">Instrumento / tipo</Label>
          <Input
            id="campo-instrumento"
            value={valores.instrumento}
            onChange={(e) => alterar('instrumento', e.target.value)}
            placeholder="Ex.: Teclado"
            maxLength={20}
            list="sugestoes-instrumento"
          />
          <datalist id="sugestoes-instrumento">
            {instrumentosSugeridos.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="campo-ordem">Ordem no SetList</Label>
          <Input
            id="campo-ordem"
            type="number"
            min={0}
            max={999}
            value={valores.ordem}
            onChange={(e) => alterar('ordem', Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="campo-observacao">Observações</Label>
        <Textarea
          id="campo-observacao"
          value={valores.observacao}
          onChange={(e) => alterar('observacao', e.target.value)}
          placeholder="Ex.: Cuidado na 2ª parte muda o andamento."
          maxLength={100}
          className="min-h-16"
        />
      </div>

      {/* Partitura (PDF) */}
      <div className="space-y-1.5">
        <Label>Partitura (PDF)</Label>
        {musica?.arquivo && !arquivo && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <Paperclip className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{musica.arquivo.nome}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatarBytes(musica.arquivo.tamanho)}
            </span>
          </div>
        )}
        {arquivo && (
          <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
            <Paperclip className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate">{arquivo.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatarBytes(arquivo.size)}
            </span>
            <button
              type="button"
              onClick={() => {
                setArquivo(null)
                if (inputArquivo.current) inputArquivo.current.value = ''
              }}
              className="rounded p-1 text-muted-foreground hover:bg-accent"
              aria-label="Remover arquivo selecionado"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
        <input
          ref={inputArquivo}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const escolhido = e.target.files?.[0] ?? null
            if (escolhido && escolhido.size > TAMANHO_MAXIMO_PDF) {
              toast.error(
                `PDF de ${formatarBytes(escolhido.size)} — o limite é ` +
                  `${Math.round(TAMANHO_MAXIMO_PDF / 1024)} KB. Reduza o arquivo e tente novamente.`,
              )
              setArquivo(null)
              e.target.value = ''
              return
            }
            setArquivo(escolhido)
            setAnalise(null)
            if (escolhido) void analisar(escolhido)
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => inputArquivo.current?.click()}
        >
          {analisando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileUp className="size-4" />
          )}
          {arquivo || musica?.arquivo ? 'Trocar PDF' : 'Enviar PDF'}
        </Button>

        {analisando && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileSearch className="size-3.5 animate-pulse" />
            Lendo a partitura…
          </p>
        )}

        {analise && !analisando && (
          <div className="rounded-lg border border-primary/30 bg-primary/[0.07] p-2.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />
              Partitura analisada
              {analise.paginas > 0 && ` · ${analise.paginas} página(s)`}
            </p>
            <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
              {analise.titulo && (
                <>
                  <dt className="text-muted-foreground">Nome</dt>
                  <dd className="truncate font-medium">{analise.titulo}</dd>
                </>
              )}
              {analise.autor && (
                <>
                  <dt className="text-muted-foreground">Autor</dt>
                  <dd className="truncate font-medium">{analise.autor}</dd>
                </>
              )}
              {analise.instrumento && (
                <>
                  <dt className="text-muted-foreground">Instrumento</dt>
                  <dd className="truncate font-medium">{analise.instrumento}</dd>
                </>
              )}
              {analise.estilo && (
                <>
                  <dt className="text-muted-foreground">Estilo</dt>
                  <dd className="truncate font-medium">{analise.estilo}</dd>
                </>
              )}
            </dl>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Os campos vazios foram preenchidos — ajuste o que quiser.
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          PDF de até {Math.round(TAMANHO_MAXIMO_PDF / 1024)} KB (o limite vem do Firestore, que
          aceita 1 MB por documento).
        </p>
      </div>

      {/* Rolagem automática */}
      <Card className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Rolagem automática</p>
            <p className="text-xs text-muted-foreground">
              A partitura rola sozinha quando você inicia a execução.
            </p>
          </div>
          <Switch
            checked={valores.rolamento}
            onCheckedChange={(v) => alterar('rolamento', v)}
            aria-label="Ativar rolagem automática"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="campo-velocidade">Velocidade</Label>
            <span className="text-sm font-semibold tabular-nums">{valores.velocidade}</span>
          </div>
          <Slider
            id="campo-velocidade"
            value={[valores.velocidade]}
            min={VELOCIDADE_MIN}
            max={VELOCIDADE_MAX}
            step={1}
            onValueChange={([v]) => alterar('velocidade', v)}
          />
          <p className="text-xs text-muted-foreground">
            De {VELOCIDADE_MIN} (parado) a {VELOCIDADE_MAX} (bem rápido).
          </p>
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={aoFechar} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando} className="gap-2">
          {salvando && <Loader2 className="size-4 animate-spin" />}
          {musica ? 'Salvar alterações' : 'Cadastrar música'}
        </Button>
      </div>
    </form>
  )
}
