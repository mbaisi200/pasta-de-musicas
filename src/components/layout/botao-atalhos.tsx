'use client'

import * as React from 'react'
import { Keyboard } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const ATALHOS = [
  { teclas: ['Espaço'], acao: 'Rolar / parar a rolagem automática' },
  { teclas: ['←', '→'], acao: 'Página anterior / próxima' },
  { teclas: ['+', '−'], acao: 'Aumentar / diminuir a velocidade' },
  { teclas: ['F'], acao: 'Tela cheia' },
  { teclas: ['L'], acao: 'Abrir a lista do SetList' },
  { teclas: ['Esc'], acao: 'Parar a rolagem' },
]

/**
 * Atalho de teclado que abre a lista de atalhos.
 * Só aparece em telas com teclado (desktop) — no celular não faz sentido.
 */
export function BotaoAtalhos() {
  const [aberto, setAberto] = React.useState(false)

  React.useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      const alvo = evento.target as HTMLElement
      if (alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)) return
      if (evento.key === '?' || (evento.key === '/' && evento.shiftKey)) {
        evento.preventDefault()
        setAberto(true)
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hidden size-9 lg:inline-flex"
          aria-label="Atalhos de teclado"
        >
          <Keyboard className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4 text-primary" />
            Atalhos de teclado
          </DialogTitle>
          <DialogDescription>
            Funcionam enquanto a partitura está aberta (o player não usa o teclado
            quando você está digitando).
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {ATALHOS.map((atalho) => (
            <li key={atalho.acao} className="flex items-center gap-3">
              <span className="flex shrink-0 gap-1">
                {atalho.teclas.map((tecla) => (
                  <kbd
                    key={tecla}
                    className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium"
                  >
                    {tecla}
                  </kbd>
                ))}
              </span>
              <span className="text-sm text-muted-foreground">{atalho.acao}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
