'use client'

import * as React from 'react'
import { Gauge, Mic, MicOff, Music } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- *
 * Afinador — capta o som do microfone e mostra a nota detecteda.
 *
 * Detecção de altura (pitch) por AUTOCORRELAÇÃO (NSDF / McLeod):
 *   1. buffer do AnalyserNode (float, tempo-domínio)
 *   2. remove a média (DC offset)
 *   3. passa-baixa de 4ª ordem (corta agudos que só poluem a correlação)
 *   4. decima por 4 (barato e sem aliasing, já que o corte é < Nyquist)
 *   5. NSDF normalizado -> busca do primeiro "pico chave"
 *   6. interpolação parabólica -> precisão sub-amostra (cents estável)
 * -------------------------------------------------------------------------- */

const FREQ_MIN = 60
const FREQ_MAX = 1400

const FFT_SIZE = 4096
const TAXA_DECIMACAO = 4
const CORTE_FILTRO_HZ = 1800
const LIMIAR_RMS = 0.006
const CLAREZA_MINIMA = 0.55
const INTERVALO_ANALISE_MS = 60
const EXPIRAR_LEITURA_MS = 1500

const NOMES_NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/** Afinações de referência disponíveis (A4 em Hz). */
const REFERENCIAS_A4 = [415, 420, 425, 430, 435, 440, 442, 445, 450, 455, 460, 466]

/**
 * Buffer de amostras. Fixa o `ArrayBuffer` para casar exatamente com a
 * assinatura de `AnalyserNode.getFloatTimeDomainData` nas versões recentes
 * do TypeScript (lib.dom tipada com `Float32Array<ArrayBuffer>`).
 */
type Amostra = Float32Array<ArrayBuffer>

interface Leitura {
  frequencia: number
  clareza: number
  em: number
}

interface Deteccao {
  frequencia: number
  clareza: number
}

interface Nota {
  nome: string
  oitava: number
  cents: number
  frequencia: number
}

/* ------------------------------- DSP ------------------------------------- */

function calcularRms(buffer: Amostra): number {
  let soma = 0
  for (let i = 0; i < buffer.length; i++) soma += buffer[i] * buffer[i]
  return Math.sqrt(soma / buffer.length)
}

/** Remove o nível DC (offset) do buffer. */
function removerMedia(buffer: Amostra): Amostra {
  let soma = 0
  for (let i = 0; i < buffer.length; i++) soma += buffer[i]
  const media = soma / buffer.length
  const saida = new Float32Array(buffer.length)
  for (let i = 0; i < buffer.length; i++) saida[i] = buffer[i] - media
  return saida
}

/** Passa-baixa biquad (Butterworth, Q = 0.707) aplicado duas vezes. */
function passaBaixa(entrada: Amostra, taxa: number, corte: number): Amostra {
  const w0 = (2 * Math.PI * corte) / taxa
  const cosW0 = Math.cos(w0)
  const sinW0 = Math.sin(w0)
  const q = 0.707
  const alfa = sinW0 / (2 * q)
  const a0 = 1 + alfa
  const b0 = (1 - cosW0) / 2 / a0
  const b1 = (1 - cosW0) / a0
  const b2 = b0
  const a1 = (-2 * cosW0) / a0
  const a2 = (1 - alfa) / a0

  let atual = entrada
  for (let passagem = 0; passagem < 2; passagem++) {
    const saida: Amostra = new Float32Array(atual.length)
    let x1 = 0
    let x2 = 0
    let y1 = 0
    let y2 = 0
    for (let i = 0; i < atual.length; i++) {
      const x = atual[i]
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
      x2 = x1
      x1 = x
      y2 = y1
      y1 = y
      saida[i] = y
    }
    atual = saida
  }
  return atual
}

/** Decimação simples (o passa-baixa anterior já removeu o aliasing). */
function decimar(buffer: Amostra, fator: number): Amostra {
  const tamanho = Math.floor(buffer.length / fator)
  const saida: Amostra = new Float32Array(tamanho)
  for (let i = 0; i < tamanho; i++) saida[i] = buffer[i * fator]
  return saida
}

/**
 * NSDF (Normalized Square Difference Function) — autocorrelação normalizada.
 * Valor 1 = periodicidade perfeita, 0 = sem relação, -1 = invertida.
 */
function nsdf(buffer: Amostra, maxLag: number): Float32Array {
  const n = buffer.length
  const saida = new Float32Array(maxLag + 1)
  for (let lag = 0; lag <= maxLag; lag++) {
    let correlacao = 0
    let energia = 0
    const limite = n - lag
    for (let j = 0; j < limite; j++) {
      const a = buffer[j]
      const b = buffer[j + lag]
      correlacao += a * b
      energia += a * a + b * b
    }
    saida[lag] = energia > 0 ? (2 * correlacao) / energia : 0
  }
  return saida
}

/**
 * Procura o primeiro "pico chave" da NSDF (McLeod): o primeiro máximo local
 * que atinge 85% do maior valor — evita escolher um harmônico errado.
 */
function acharPico(
  correlacao: Float32Array,
  minLag: number,
  maxLag: number,
): { lag: number; clareza: number } | null {
  // 1) Primeiro vale (a correlação fica negativa antes de virar pico).
  let i = minLag
  while (i <= maxLag && correlacao[i] > 0) i++
  // 2) Sai do vale: o próximo trecho positivo já contém o primeiro pico real.
  while (i <= maxLag && correlacao[i] <= 0) i++
  if (i > maxLag) return null

  // 3) Maior valor global a partir dali -> define o limiar.
  let maximo = -1
  for (let j = i; j <= maxLag; j++) {
    if (correlacao[j] > maximo) maximo = correlacao[j]
  }
  if (maximo <= 0) return null

  // 4) Primeiro pico que atinge o limiar (85%).
  const limiar = maximo * 0.85
  let pico = -1
  for (let j = i; j <= maxLag; j++) {
    if (correlacao[j] >= limiar) {
      let k = j
      while (k + 1 <= maxLag && correlacao[k + 1] >= correlacao[k]) k++
      pico = k
      break
    }
  }
  if (pico < 0) return null

  // 5) Interpolação parabólica -> lag fracionário (precisão de cents).
  let lag = pico
  if (pico > 0 && pico < maxLag) {
    const y0 = correlacao[pico - 1]
    const y1 = correlacao[pico]
    const y2 = correlacao[pico + 1]
    const den = y0 - 2 * y1 + y2
    if (den !== 0) {
      const delta = (0.5 * (y0 - y2)) / den
      if (delta > -1 && delta < 1) lag = pico + delta
    }
  }

  return { lag, clareza: Math.max(0, Math.min(1, correlacao[pico])) }
}

/** Detecta a frequência fundamental no buffer (ou null se não houver tom). */
function detectarFrequencia(bruto: Amostra, taxa: number): Deteccao | null {
  const rms = calcularRms(bruto)
  if (rms < LIMIAR_RMS) return null

  const semMedia = removerMedia(bruto)
  const filtrado = passaBaixa(semMedia, taxa, CORTE_FILTRO_HZ)
  const janela = decimar(filtrado, TAXA_DECIMACAO)
  const taxaEfetiva = taxa / TAXA_DECIMACAO

  const minLag = Math.max(2, Math.floor(taxaEfetiva / FREQ_MAX))
  const maxLag = Math.min(janela.length - 2, Math.ceil(taxaEfetiva / FREQ_MIN))
  if (maxLag <= minLag + 2) return null

  const correlacao = nsdf(janela, maxLag)
  const pico = acharPico(correlacao, minLag, maxLag)
  if (!pico || pico.clareza < CLAREZA_MINIMA) return null

  const frequencia = taxaEfetiva / pico.lag
  if (frequencia < FREQ_MIN || frequencia > FREQ_MAX) return null

  return { frequencia, clareza: pico.clareza }
}

/* ------------------------------ Música ----------------------------------- */

/** Converte a frequência em nota (A4 = referência), com desvio em cents. */
function notaDe(frequencia: number, referencia: number): Nota {
  const midi = 69 + 12 * Math.log2(frequencia / referencia)
  const inteiro = Math.round(midi)
  const cents = (midi - inteiro) * 100
  const indice = ((inteiro % 12) + 12) % 12
  return {
    nome: NOMES_NOTAS[indice],
    oitava: Math.floor(inteiro / 12) - 1,
    cents: Math.max(-50, Math.min(50, cents)),
    frequencia,
  }
}

/** Faixa aproximada em que a nota detectada costuma cair. */
function faixaDaFrequencia(frequencia: number): { titulo: string; dica: string } {
  if (frequencia < 150) {
    return {
      titulo: 'Faixa grave',
      dica: 'Típico de baixo, cavaquinho e mão esquerda do violão.',
    }
  }
  if (frequencia < 600) {
    return {
      titulo: 'Faixa média',
      dica: 'Típico de violão, tenor, sax tenor e contrabaixo agudo.',
    }
  }
  return {
    titulo: 'Faixa aguda',
    dica: 'Típico de flauta, violino, clarinete e sopros agudos.',
  }
}

/**
 * Cor do desvio, usando apenas tokens do tema:
 *  - até ±5 cents  -> `primary` (destacado = afinado)
 *  - ±5 a ±20 cents -> `accent-foreground` (atenção)
 *  - acima de ±20   -> `destructive` (erro)
 */
function estiloDoDesvio(cents: number): { texto: string; barra: string } {
  const abs = Math.abs(cents)
  if (abs <= 5) return { texto: 'text-primary', barra: 'bg-primary' }
  if (abs <= 20) return { texto: 'text-accent-foreground', barra: 'bg-accent' }
  return { texto: 'text-destructive', barra: 'bg-destructive' }
}

/* ------------------------------ Web Audio -------------------------------- */

type ConstrutorAudioContext = new (options?: AudioContextOptions) => AudioContext

function criarContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const suporte = window as Window & { webkitAudioContext?: ConstrutorAudioContext }
  const Construtor =
    (window.AudioContext as ConstrutorAudioContext | undefined) ?? suporte.webkitAudioContext
  if (!Construtor) return null
  try {
    return new Construtor()
  } catch {
    return null
  }
}

function mensagemDeErro(erro: unknown): string {
  const nome = erro instanceof DOMException ? erro.name : ''
  if (nome === 'NotAllowedError' || nome === 'SecurityError') {
    return 'Permissão de microfone negada. Libere o acesso nas configurações do navegador e tente de novo.'
  }
  if (nome === 'NotFoundError' || nome === 'DevicesNotFoundError') {
    return 'Nenhum microfone encontrado. Conecte um microfone ou fone de ouvido com microfone.'
  }
  if (nome === 'NotReadableError' || nome === 'TrackStartError') {
    return 'O microfone está sendo usado por outro aplicativo. Feche-o e tente de novo.'
  }
  return 'Não foi possível acessar o microfone. Verifique as permissões do navegador.'
}

/* ------------------------------- Componente ------------------------------ */

export function Afinador() {
  const [ativo, setAtivo] = React.useState(false)
  const [carregando, setCarregando] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)
  const [referencia, setReferencia] = React.useState(440)
  const [nivel, setNivel] = React.useState(0)
  const [leitura, setLeitura] = React.useState<Leitura | null>(null)
  const [sinal, setSinal] = React.useState(false)

  const contextoRef = React.useRef<AudioContext | null>(null)
  const analisadorRef = React.useRef<AnalyserNode | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const bufferRef = React.useRef<Amostra | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const ultimoQuadroRef = React.useRef(0)
  const historicoRef = React.useRef<number[]>([])
  const suavizadoRef = React.useRef<number | null>(null)
  const leituraRef = React.useRef<Leitura | null>(null)

  const nota = React.useMemo(
    () => (leitura ? notaDe(leitura.frequencia, referencia) : null),
    [leitura, referencia],
  )

  const faixa = React.useMemo(
    () => (leitura ? faixaDaFrequencia(leitura.frequencia) : null),
    [leitura],
  )

  const encerrar = React.useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    const contexto = contextoRef.current
    if (contexto) {
      contextoRef.current = null
      void contexto.close().catch(() => undefined)
    }
    analisadorRef.current = null
    bufferRef.current = null
  }, [])

  // Libera o microfone ao sair da tela.
  React.useEffect(() => () => encerrar(), [encerrar])

  function suavizar(frequencia: number): number {
    const historico = historicoRef.current
    historico.push(frequencia)
    if (historico.length > 5) historico.shift()
    const ordenado = [...historico].sort((a, b) => a - b)
    const mediana = ordenado[Math.floor(ordenado.length / 2)]
    const anterior = suavizadoRef.current
    const valor = anterior === null ? mediana : anterior * 0.45 + mediana * 0.55
    suavizadoRef.current = valor
    return valor
  }

  function desligar() {
    encerrar()
    setAtivo(false)
    setSinal(false)
    setNivel(0)
    setLeitura(null)
    leituraRef.current = null
    historicoRef.current = []
    suavizadoRef.current = null
  }

  async function ativar() {
    setErro(null)

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const mensagem =
        'Este navegador não permite usar o microfone. Abra a página em HTTPS ou use um navegador atualizado.'
      setErro(mensagem)
      toast.error('Microfone indisponível')
      return
    }

    setCarregando(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const contexto = criarContexto()
      if (!contexto) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error('Web Audio API indisponível')
      }
      // iOS/Safari exige retomada dentro de um gesto do usuário.
      if (contexto.state === 'suspended') {
        await contexto.resume().catch(() => undefined)
      }

      const analisador = contexto.createAnalyser()
      analisador.fftSize = FFT_SIZE
      analisador.smoothingTimeConstant = 0

      const fonte = contexto.createMediaStreamSource(stream)
      fonte.connect(analisador)

      contextoRef.current = contexto
      analisadorRef.current = analisador
      streamRef.current = stream
      bufferRef.current = new Float32Array(analisador.fftSize)

      historicoRef.current = []
      suavizadoRef.current = null
      ultimoQuadroRef.current = 0

      const laco = (): void => {
        rafRef.current = requestAnimationFrame(laco)
        const ctx = contextoRef.current
        const node = analisadorRef.current
        const buffer = bufferRef.current
        if (!ctx || !node || !buffer) return

        const agora = performance.now()
        if (agora - ultimoQuadroRef.current < INTERVALO_ANALISE_MS) return
        ultimoQuadroRef.current = agora

        node.getFloatTimeDomainData(buffer)

        const rms = calcularRms(buffer)
        setNivel(Math.max(0, Math.min(1, rms * 6)))

        const deteccao = detectarFrequencia(buffer, ctx.sampleRate)
        if (deteccao) {
          const valor: Leitura = {
            frequencia: suavizar(deteccao.frequencia),
            clareza: deteccao.clareza,
            em: agora,
          }
          leituraRef.current = valor
          setLeitura(valor)
          setSinal(true)
        } else {
          setSinal(false)
          const anterior = leituraRef.current
          if (anterior && agora - anterior.em > EXPIRAR_LEITURA_MS) {
            leituraRef.current = null
            setLeitura(null)
          }
        }
      }

      rafRef.current = requestAnimationFrame(laco)
      setAtivo(true)
    } catch (erroCapturado) {
      desligar()
      const mensagem = mensagemDeErro(erroCapturado)
      setErro(mensagem)
      toast.error('Não foi possível ativar o microfone')
    } finally {
      setCarregando(false)
    }
  }

  const desvio = nota ? nota.cents : 0
  const estilo = estiloDoDesvio(desvio)
  const posicaoAgulha = 50 + (desvio / 50) * 50

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="size-4 text-primary" />
          Afinador
        </CardTitle>
        <CardDescription>
          Toque uma nota no microfone e veja o quanto ela está fora da afinação.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {erro && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/15 p-3 text-sm text-destructive"
          >
            {erro}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full sm:w-auto"
            variant={ativo ? 'outline' : 'default'}
            onClick={() => (ativo ? desligar() : void ativar())}
            disabled={carregando}
          >
            {ativo ? <MicOff /> : <Mic />}
            {ativo ? 'Desligar' : carregando ? 'Abrindo...' : 'Ativar microfone'}
          </Button>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Gauge className="size-3.5" />
                Nível do microfone
              </span>
              <span className="tabular-nums">{Math.round(nivel * 100)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-75',
                  sinal ? 'bg-primary' : 'bg-muted-foreground/40',
                )}
                style={{ width: `${Math.round(nivel * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Nota detectada */}
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/40 px-4 py-6 text-center"
          aria-live="polite"
        >
          {nota ? (
            <>
              <div className={cn('flex items-baseline gap-1', estilo.texto)}>
                <span className="text-6xl font-bold leading-none tabular-nums sm:text-7xl">
                  {nota.nome}
                </span>
                <span className="text-2xl font-semibold tabular-nums">{nota.oitava}</span>
              </div>
              <p className={cn('mt-2 text-base font-medium tabular-nums', estilo.texto)}>
                {desvio > 0 ? '+' : ''}
                {Math.round(desvio)} cents
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {Math.abs(desvio) <= 5
                  ? 'Afinada — continue assim!'
                  : desvio > 0
                    ? 'Um pouco acima da afinação.'
                    : 'Um pouco abaixo da afinação.'}
              </p>
            </>
          ) : (
            <>
              <span className="text-6xl font-bold leading-none text-muted-foreground">—</span>
              <p className="mt-2 text-sm text-muted-foreground">
                {ativo
                  ? sinal
                    ? 'Procurando uma nota…'
                    : 'Toque uma nota perto do microfone.'
                  : 'Ative o microfone para começar.'}
              </p>
            </>
          )}
        </div>

        {/* Medidor de desvio */}
        <div className="space-y-1.5">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="absolute inset-y-0 left-[10%] w-[30%] bg-primary/15" />
            <div className="absolute inset-y-0 left-[60%] w-[30%] bg-primary/15" />
            <div className="absolute inset-y-0 left-[45%] w-[10%] bg-primary/40" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
            {nota && (
              <div
                className={cn('absolute inset-y-0 w-1 -translate-x-1/2 rounded-full', estilo.barra)}
                style={{ left: `${posicaoAgulha}%` }}
              />
            )}
          </div>
          <div className="grid grid-cols-3 text-[11px] text-muted-foreground tabular-nums">
            <span>-50</span>
            <span className="text-center">0</span>
            <span className="text-right">+50</span>
          </div>
        </div>

        {/* Informações da leitura */}
        <div className="flex flex-wrap items-center gap-2">
          {nota ? (
            <>
              <Badge variant="outline" className="tabular-nums">
                {nota.frequencia.toFixed(1)} Hz
              </Badge>
              {faixa && <Badge variant="muted">{faixa.titulo}</Badge>}
              {leitura && (
                <Badge variant="muted" className="tabular-nums">
                  Clareza {Math.round(leitura.clareza * 100)}%
                </Badge>
              )}
            </>
          ) : (
            <Badge variant="muted">Sem leitura</Badge>
          )}
        </div>
        {faixa && <p className="text-xs text-muted-foreground">{faixa.dica}</p>}

        {/* Afinação de referência */}
        <div className="space-y-1.5">
          <Label htmlFor="afinador-referencia">Afinação de referência (Lá4)</Label>
          <Select
            value={String(referencia)}
            onValueChange={(valor) => setReferencia(Number(valor))}
          >
            <SelectTrigger id="afinador-referencia" className="h-10 w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REFERENCIAS_A4.map((hz) => (
                <SelectItem key={hz} value={String(hz)}>
                  {hz} Hz
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            O padrão é 440 Hz. Em orquestras e corsos costuma-se usar 442 ou 444 Hz.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
