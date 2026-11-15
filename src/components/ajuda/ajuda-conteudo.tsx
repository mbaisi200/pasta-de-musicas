'use client'

import * as React from 'react'
import {
  Gauge,
  Info,
  Mail,
  MessageSquare,
  Mic,
  Music4,
  Smartphone,
  Tablet,
  User,
} from 'lucide-react'

import { Afinador } from '@/components/ajuda/afinador'
import { Metronomo } from '@/components/ajuda/metronomo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Configuracoes, Equipamento } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Chave usada para lembrar o equipamento escolhido neste dispositivo. */
const CHAVE_EQUIPAMENTO = 'pasta-de-musicas:equipamento'
const EVENTO_EQUIPAMENTO = 'pasta-de-musicas:equipamento:alterado'

/** Assina mudanças na preferência de equipamento (outras abas/ações). */
function assinarEquipamento(callback: () => void): () => void {
  window.addEventListener(EVENTO_EQUIPAMENTO, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENTO_EQUIPAMENTO, callback)
    window.removeEventListener('storage', callback)
  }
}

/** Lê a preferência salva (null quando ainda não escolhida). */
function lerEquipamentoSalvo(): Equipamento | null {
  try {
    const salvo = window.localStorage.getItem(CHAVE_EQUIPAMENTO)
    if (salvo === 'micro' || salvo === 'tablet' || salvo === 'celular') return salvo
  } catch {
    /* modo privativo */
  }
  return null
}

const EQUIPAMENTOS: { valor: Equipamento; rotulo: string }[] = [
  { valor: 'micro', rotulo: 'Micro' },
  { valor: 'tablet', rotulo: 'Tablet' },
  { valor: 'celular', rotulo: 'Celular' },
]

const ROTULO_EQUIPAMENTO: Record<Equipamento, string> = {
  micro: 'Microfone',
  tablet: 'Tablet',
  celular: 'Celular',
}

/** Ícone de cada equipamento (Micro / Tablet / Celular). */
function iconeEquipamento(valor: Equipamento) {
  if (valor === 'micro') return <Mic className="size-4" />
  if (valor === 'tablet') return <Tablet className="size-4" />
  return <Smartphone className="size-4" />
}

interface AjudaConteudoProps {
  configuracoes: Configuracoes
}

export function AjudaConteudo({ configuracoes }: AjudaConteudoProps) {
  const [aba, setAba] = React.useState('sobre')

  // Preferência salva no dispositivo. `useSyncExternalStore` evita o
  // hydration mismatch (o servidor usa a configuração, o cliente a preferência).
  const equipamentoSalvo = React.useSyncExternalStore(
    assinarEquipamento,
    lerEquipamentoSalvo,
    () => null,
  )
  const [equipamento, setEquipamento] = React.useState<Equipamento>(configuracoes.equipamento)
  const equipamentoAtual = equipamentoSalvo ?? equipamento

  function escolherEquipamento(valor: Equipamento) {
    setEquipamento(valor)
    try {
      window.localStorage.setItem(CHAVE_EQUIPAMENTO, valor)
      window.dispatchEvent(new Event(EVENTO_EQUIPAMENTO))
    } catch {
      /* modo privativo: apenas mantém em memória */
    }
  }

  const textoAjuda = configuracoes.ajuda?.trim()
    ? configuracoes.ajuda
    : 'Este aplicativo está organizando suas partituras.\n\n' +
      '1. Use a busca e os filtros para achar a música.\n' +
      '2. Toque no nome da música para abrir a partitura.\n' +
      '3. Em Manutenção você cadastra, altera e exclui músicas.'

  return (
    <div className="mx-auto w-full max-w-4xl px-3 pb-24 pt-4 sm:px-6 sm:pt-6">
      <header className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ajuda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tudo o que você precisa para tocar com o app
          </p>
        </div>

        <SeletorEquipamento valor={equipamentoAtual} aoEscolher={escolherEquipamento} />
      </header>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="sobre" className="flex-1 sm:flex-none">
            Sobre
          </TabsTrigger>
          <TabsTrigger value="afinador" className="flex-1 sm:flex-none">
            Afinador
          </TabsTrigger>
          <TabsTrigger value="metronomo" className="flex-1 sm:flex-none">
            Metrônomo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sobre" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="size-4 text-primary" />
                Como usar
              </CardTitle>
              <CardDescription>Guia rápido do Pasta de Músicas.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {textoAjuda}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary" />
                  Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {configuracoes.mensagem?.trim() && (
                  <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                    {configuracoes.mensagem}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <User className="size-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{configuracoes.nome || '—'}</span>
                </div>
                <a
                  href={configuracoes.email ? `mailto:${configuracoes.email}` : undefined}
                  className={cn(
                    'flex items-center gap-2',
                    configuracoes.email
                      ? 'text-primary hover:underline'
                      : 'text-muted-foreground',
                  )}
                >
                  <Mail className="size-4 shrink-0" />
                  {configuracoes.email || '—'}
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music4 className="size-4 text-primary" />
                  Aplicativo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Versão</span>
                  <Badge variant="secondary" className="tabular-nums">
                    {configuracoes.versao || '—'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Instrumento padrão</span>
                  <span className="font-medium">
                    {configuracoes.instrumentoPadrao || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Equipamento</span>
                  <span className="font-medium">{ROTULO_EQUIPAMENTO[equipamento]}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="size-4 text-primary" />
                Ferramentas
              </CardTitle>
              <CardDescription>
                Afinador e metrônomo funcionam direto no navegador, sem instalar nada.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => setAba('afinador')}
              >
                Abrir afinador
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => setAba('metronomo')}
              >
                Abrir metrônomo
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="afinador">
          <Afinador />
        </TabsContent>

        <TabsContent value="metronomo">
          <Metronomo />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SeletorEquipamento({
  valor,
  aoEscolher,
}: {
  valor: Equipamento
  aoEscolher: (valor: Equipamento) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <p className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Equipamento
      </p>
      <div className="flex gap-1.5">
        {EQUIPAMENTOS.map((item) => {
          const ativo = valor === item.valor
          return (
            <Button
              key={item.valor}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={ativo}
              onClick={() => aoEscolher(item.valor)}
              className={cn(
                'h-10 flex-1 gap-1.5 sm:flex-none',
                ativo
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {iconeEquipamento(item.valor)}
              {item.rotulo}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
