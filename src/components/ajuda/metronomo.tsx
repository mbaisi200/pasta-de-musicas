'use client'

import * as React from 'react'
import { Gauge, Pause, Play, RotateCcw, Timer, Volume2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- *
 * Metrônomo — Web Audio API com agendamento "look-ahead".
 *
 * O relógio do `setInterval` serve apenas para *enfileirar* os cliques no
 * relógio de áudio (`AudioContext.currentTime`), que é estável e não sofre
 * jitter. Cada clique é agendado com antecedência e toca exatamente no tempo.
 * -------------------------------------------------------------------------- */

const BPM_MIN = 40
const BPM_MAX = 240
const BPM_PADRAO = 120

/** Intervalo do agendador (ms) e janela de antecipação (s). */
const INTERVALO_AGENDADOR_MS = 25
const ANTECIPACAO_S = 0.12

type Compasso = '2/4' | '3/4' | '4/4' | '6/8'
type Subdivisao = 'desligada' | 'colcheias'

/** Quantidade de pulsos (pontos) de cada compasso. */
const COMPASSOS: Record<Compasso, number> = {
  '2/4': 2,
  '3/4': 3,
  '4/4': 4,
  '6/8': 6,
}

const LISTA_COMPASSOS: Compasso[] = ['2/4', '3/4', '4/4', '6/8']

interface EventoVisual {
  tempo: number
  indice: number
  subdivisao: boolean
}

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

/** Clique percussivo gerado em memória (senoide com envelope exponencial). */
function criarClique(contexto: AudioContext, acentuado: boolean): AudioBuffer {
  const duracao = acentuado ? 0.06 : 0.035
  const taxa = contexto.sampleRate
  const tamanho = Math.max(1, Math.floor(duracao * taxa))
  const buffer = contexto.createBuffer(1, tamanho, taxa)
  const dados = buffer.getChannelData(0)
  const frequencia = acentuado ? 2100 : 1450
  const decaimento = acentuado ? 45 : 70
  for (let i = 0; i < tamanho; i++) {
    const t = i / taxa
    dados[i] = Math.exp(-t * decaimento) * Math.sin(2 * Math.PI * frequencia * t) * 0.9
  }
  return buffer
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor))
}

export function Metronomo() {
  const [bpm, setBpm] = React.useState(BPM_PADRAO)
  const [bpmTexto, setBpmTexto] = React.useState(String(BPM_PADRAO))
  const [compasso, setCompasso] = React.useState<Compasso>('4/4')
  const [subdivisao, setSubdivisao] = React.useState<Subdivisao>('desligada')
  const [acentuado, setAcentuado] = React.useState(true)
  const [volume, setVolume] = React.useState(80)

  const [rodando, setRodando] = React.useState(false)
  const [indiceAtual, setIndiceAtual] = React.useState(-1)
  const [pulso, setPulso] = React.useState(0)
  const [toques, setToques] = React.useState(0)

  const contextoRef = React.useRef<AudioContext | null>(null)
  const destinoRef = React.useRef<GainNode | null>(null)
  const cliqueForteRef = React.useRef<AudioBuffer | null>(null)
  const cliqueFracoRef = React.useRef<AudioBuffer | null>(null)
  const temporizadorRef = React.useRef<number | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const proximoTempoRef = React.useRef(0)
  const ultimoTempoRef = React.useRef(0)
  const contadorRef = React.useRef(0)
  const filaRef = React.useRef<EventoVisual[]>([])
  const toquesRef = React.useRef<number[]>([])

  // Espelhos dos controles usados pelo agendador (evita recriar o timer).
  const bpmRef = React.useRef(bpm)
  const compassoRef = React.useRef(compasso)
  const subdivisaoRef = React.useRef(subdivisao)
  const acentuadoRef = React.useRef(acentuado)

  const totalBatidas = COMPASSOS[compasso]

  /* ----------------------------- Áudio ---------------------------------- */

  const garantirContexto = React.useCallback((): AudioContext | null => {
    const existente = contextoRef.current
    if (existente) return existente

    const contexto = criarContexto()
    if (!contexto) return null

    const destino = contexto.createGain()
    destino.gain.value = volume / 100
    destino.connect(contexto.destination)

    contextoRef.current = contexto
    destinoRef.current = destino
    cliqueForteRef.current = criarClique(contexto, true)
    cliqueFracoRef.current = criarClique(contexto, false)
    return contexto
  }, [volume])

  const tocarClique = React.useCallback(
    (contexto: AudioContext, tempo: number, forte: boolean, ganho: number) => {
      const buffer = forte ? cliqueForteRef.current : cliqueFracoRef.current
      const destino = destinoRef.current
      if (!buffer || !destino) return
      const fonte = contexto.createBufferSource()
      fonte.buffer = buffer
      const ganhoNo = contexto.createGain()
      ganhoNo.gain.value = ganho
      fonte.connect(ganhoNo)
      ganhoNo.connect(destino)
      fonte.start(tempo)
      fonte.stop(tempo + buffer.duration + 0.02)
    },
    [],
  )

  /* --------------------------- Agendamento ------------------------------ */

  const agendar = React.useCallback(() => {
    const contexto = contextoRef.current
    if (!contexto) return

    const duracao = 60 / bpmRef.current
    const limite = contexto.currentTime + ANTECIPACAO_S

    while (proximoTempoRef.current < limite) {
      const total = COMPASSOS[compassoRef.current]
      const contador = contadorRef.current
      const indice = ((contador % total) + total) % total
      const forte =
        acentuadoRef.current &&
        (indice === 0 || (compassoRef.current === '6/8' && indice === 3))

      const tempo = proximoTempoRef.current
      tocarClique(contexto, tempo, forte, forte ? 1 : 0.55)
      filaRef.current.push({ tempo, indice, subdivisao: false })

      if (subdivisaoRef.current === 'colcheias') {
        const tempoSubdivisao = tempo + duracao / 2
        tocarClique(contexto, tempoSubdivisao, false, 0.25)
        filaRef.current.push({ tempo: tempoSubdivisao, indice, subdivisao: true })
      }

      ultimoTempoRef.current = tempo
      proximoTempoRef.current = tempo + duracao
      contadorRef.current = contador + 1
    }
  }, [tocarClique])

  /* ------------------------ Indicador visual ---------------------------- */

  React.useEffect(() => {
    const laco = (): void => {
      rafRef.current = requestAnimationFrame(laco)
      const contexto = contextoRef.current
      if (!contexto) return
      const agora = contexto.currentTime
      const fila = filaRef.current
      while (fila.length > 0 && fila[0].tempo <= agora) {
        const evento = fila.shift()
        if (!evento) break
        if (!evento.subdivisao) setIndiceAtual(evento.indice)
        setPulso((valor) => valor + 1)
      }
    }
    rafRef.current = requestAnimationFrame(laco)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  // Limpa tudo ao sair da tela.
  React.useEffect(
    () => () => {
      if (temporizadorRef.current !== null) {
        window.clearInterval(temporizadorRef.current)
        temporizadorRef.current = null
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      filaRef.current = []
      const contexto = contextoRef.current
      contextoRef.current = null
      destinoRef.current = null
      if (contexto) void contexto.close().catch(() => undefined)
    },
    [],
  )

  // Volume aplicado em tempo real.
  React.useEffect(() => {
    const destino = destinoRef.current
    if (destino) destino.gain.value = volume / 100
  }, [volume])

  /* --------------------------- Controles -------------------------------- */

  function aplicarBpm(valor: number) {
    const novo = limitar(Math.round(valor), BPM_MIN, BPM_MAX)
    setBpm(novo)
    setBpmTexto(String(novo))
    bpmRef.current = novo
    // Se estiver rodando, o novo tempo vale já na próxima batida.
    if (rodando) {
      const contexto = contextoRef.current
      if (contexto) {
        const proximo = ultimoTempoRef.current + 60 / novo
        proximoTempoRef.current = Math.max(proximo, contexto.currentTime + 0.02)
      }
    }
  }

  function digitarBpm(texto: string) {
    setBpmTexto(texto)
    const numero = Number(texto)
    if (!Number.isNaN(numero) && numero >= BPM_MIN && numero <= BPM_MAX) {
      setBpm(Math.round(numero))
      bpmRef.current = Math.round(numero)
    }
  }

  function confirmarBpm() {
    const numero = Number(bpmTexto)
    if (Number.isNaN(numero) || numero < BPM_MIN || numero > BPM_MAX) {
      setBpmTexto(String(bpm))
      return
    }
    aplicarBpm(numero)
  }

  function reiniciarBpm() {
    aplicarBpm(BPM_PADRAO)
  }

  function parar() {
    if (temporizadorRef.current !== null) {
      window.clearInterval(temporizadorRef.current)
      temporizadorRef.current = null
    }
    filaRef.current = []
    setRodando(false)
    setIndiceAtual(-1)
    setPulso(0)
  }

  async function iniciar() {
    try {
      const contexto = garantirContexto()
      if (!contexto) {
        toast.error('Áudio indisponível neste navegador.')
        return
      }
      // Safari/iOS exigem retomada dentro de um gesto do usuário.
      if (contexto.state === 'suspended') {
        await contexto.resume().catch(() => undefined)
      }

      filaRef.current = []
      contadorRef.current = 0
      proximoTempoRef.current = contexto.currentTime + 0.08
      ultimoTempoRef.current = proximoTempoRef.current
      setIndiceAtual(0)
      setPulso(0)
      setRodando(true)

      if (temporizadorRef.current !== null) {
        window.clearInterval(temporizadorRef.current)
      }
      // `window.setInterval` pode ser tipado como `NodeJS.Timeout` em alguns
      // setups (@types/node), por isso o cast para o id numérico do navegador.
      temporizadorRef.current = window.setInterval(
        agendar,
        INTERVALO_AGENDADOR_MS,
      ) as unknown as number
      agendar()
    } catch {
      toast.error('Não foi possível iniciar o metrônomo.')
      parar()
    }
  }

  function alternar() {
    if (rodando) {
      parar()
      return
    }
    void iniciar()
  }

  function tapTempo() {
    const agora = performance.now()
    const lista = toquesRef.current
    if (lista.length > 0 && agora - lista[lista.length - 1] > 2000) {
      lista.length = 0
    }
    lista.push(agora)
    while (lista.length > 6) lista.shift()
    setToques(lista.length)

    if (lista.length < 3) return

    const intervalo = (lista[lista.length - 1] - lista[0]) / (lista.length - 1)
    if (intervalo <= 0) return
    aplicarBpm(60000 / intervalo)
  }

  function limparToques() {
    toquesRef.current = []
    setToques(0)
  }

  /* ------------------------------ Render --------------------------------- */

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="size-4 text-primary" />
          Metrônomo
        </CardTitle>
        <CardDescription>
          Marque o andamento para ensaiar com precisão — o clique é gerado por síntese, sem
          arquivo de áudio.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Botões principais */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            size="lg"
            className="h-12 flex-1"
            variant={rodando ? 'outline' : 'default'}
            onClick={alternar}
          >
            {rodando ? <Pause /> : <Play />}
            {rodando ? 'Parar' : 'Iniciar'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="h-12"
            onClick={tapTempo}
            aria-label="Tap tempo: toque no ritmo para deduzir o andamento"
          >
            <Gauge />
            Tap tempo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="h-12 w-12"
            onClick={reiniciarBpm}
            aria-label={`Voltar ao andamento padrão (${BPM_PADRAO} BPM)`}
          >
            <RotateCcw />
          </Button>
        </div>

        <p className="-mt-2 text-xs text-muted-foreground">
          {toques < 3
            ? 'Toque “Tap tempo” 3 vezes ou mais no ritmo para deduzir o andamento.'
            : `${toques} toques marcados — ${bpm} BPM.`}
        </p>

        {/* Indicador de compasso */}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-6">
          <div className="flex items-center gap-3">
            {Array.from({ length: totalBatidas }, (_, indice) => (
              <div key={indice} className="relative grid size-6 place-items-center">
                <span
                  className={cn(
                    'block size-3 rounded-full transition-colors duration-100',
                    indice === indiceAtual ? 'bg-primary' : 'bg-muted',
                  )}
                />
                {indice === indiceAtual && (
                  <span
                    key={pulso}
                    className="absolute inset-0 animate-ping rounded-full border border-primary opacity-70"
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm font-medium tabular-nums">
            {compasso} · {bpm} BPM
          </p>
          <p className="text-xs text-muted-foreground">
            {rodando
              ? `Batida ${indiceAtual + 1} de ${totalBatidas}`
              : 'Metrônomo parado'}
          </p>
        </div>

        {/* Andamento */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="metronomo-bpm">Andamento</Label>
            <div className="flex items-center gap-2">
              <Input
                id="metronomo-bpm"
                type="number"
                inputMode="numeric"
                min={BPM_MIN}
                max={BPM_MAX}
                value={bpmTexto}
                onChange={(evento) => digitarBpm(evento.target.value)}
                onBlur={confirmarBpm}
                className="h-10 w-20 text-center tabular-nums"
              />
              <span className="text-sm text-muted-foreground">BPM</span>
            </div>
          </div>
          <Slider
            value={[bpm]}
            min={BPM_MIN}
            max={BPM_MAX}
            step={1}
            onValueChange={([valor]) => aplicarBpm(valor)}
            aria-label="Andamento em BPM"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
            <span>{BPM_MIN}</span>
            <span>{BPM_MAX}</span>
          </div>
        </div>

        {/* Compasso e subdivisão */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="metronomo-compasso">Compasso</Label>
            <Select
              value={compasso}
              onValueChange={(valor) => {
                const novo = valor as Compasso
                setCompasso(novo)
                compassoRef.current = novo
              }}
            >
              <SelectTrigger id="metronomo-compasso" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LISTA_COMPASSOS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="metronomo-subdivisao">Subdivisão</Label>
            <Select
              value={subdivisao}
              onValueChange={(valor) => {
                const novo = valor as Subdivisao
                setSubdivisao(novo)
                subdivisaoRef.current = novo
              }}
            >
              <SelectTrigger id="metronomo-subdivisao" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desligada">Desligada</SelectItem>
                <SelectItem value="colcheias">Colcheias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Acento */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <div className="min-w-0">
            <Label htmlFor="metronomo-acento" className="cursor-pointer">
              Batida forte
            </Label>
            <p className="text-xs text-muted-foreground">
              Acentua o 1º tempo{compasso === '6/8' ? ' e o 4º pulso' : ''} do compasso.
            </p>
          </div>
          <Switch
            id="metronomo-acento"
            checked={acentuado}
            onCheckedChange={(valor) => {
              setAcentuado(valor)
              acentuadoRef.current = valor
            }}
            aria-label="Batida forte no primeiro tempo"
          />
        </div>

        {/* Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="metronomo-volume">
              <span className="flex items-center gap-1.5">
                <Volume2 className="size-4 text-muted-foreground" />
                Volume
              </span>
            </Label>
            <span className="text-sm text-muted-foreground tabular-nums">{volume}%</span>
          </div>
          <Slider
            id="metronomo-volume"
            value={[volume]}
            min={0}
            max={100}
            step={1}
            onValueChange={([valor]) => setVolume(valor)}
            aria-label="Volume do metrônomo"
          />
        </div>

        {toques > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={limparToques}>
            Limpar marcações do tap
          </Button>
        )}

        {compasso === '6/8' && (
          <p className="text-xs text-muted-foreground">
            No 6/8, o BPM conta a colcheia (o pulso da música), como é usual.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
