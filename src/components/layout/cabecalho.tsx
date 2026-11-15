'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ListMusic, Moon, Settings2, Sun, Wrench } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useTema } from '@/hooks/use-tema'

const LINKS = [
  { href: '/', rotulo: 'Músicas', icone: ListMusic },
  { href: '/manutencao', rotulo: 'Manutenção', icone: Wrench },
  { href: '/ajuda', rotulo: 'Ajuda', icone: Settings2 },
]

export function Cabecalho() {
  const pathname = usePathname()
  const [tema, setTema] = useTema()

  // No player a interface é full-screen: a barra do site dá lugar à do player.
  if (pathname.startsWith('/musica/')) return null

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 pt-safe sm:h-16 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 no-tap-highlight">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ListMusic className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold leading-tight sm:text-base">
              Pasta de Músicas
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              Seu repertório em qualquer dispositivo
            </span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-0.5 sm:gap-1">
          {LINKS.map(({ href, rotulo, icone: Icone }) => {
            const ativo = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Button
                key={href}
                asChild
                variant="ghost"
                size="icon"
                className={cn(
                  'size-9 rounded-lg sm:size-10',
                  ativo && 'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary',
                )}
              >
                <Link href={href} aria-label={rotulo}>
                  <Icone className="size-5" />
                </Link>
              </Button>
            )
          })}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-lg sm:size-10"
                aria-label={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'}
                onClick={() => setTema(tema === 'escuro' ? 'claro' : 'escuro')}
              >
                {tema === 'escuro' ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}</TooltipContent>
          </Tooltip>
        </nav>
      </div>
    </header>
  )
}
