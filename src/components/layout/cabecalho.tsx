'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, LogOut, Moon, Settings2, Sun, Wrench } from 'lucide-react'

import { ClaveDeSolMarca, Colcheias } from '@/components/icones/musicais'

import { useAuth } from '@/components/auth/provedor-auth'
import { BotaoAtalhos } from '@/components/layout/botao-atalhos'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useTema } from '@/hooks/use-tema'

const LINKS = [
  { href: '/', rotulo: 'Músicas', icone: Colcheias },
  { href: '/manutencao', rotulo: 'Manutenção', icone: Wrench },
  { href: '/ajuda', rotulo: 'Ajuda', icone: Settings2 },
]

export function Cabecalho() {
  const pathname = usePathname()
  const [tema, setTema] = useTema()
  const { usuario, sair, carregando } = useAuth()

  // No player a interface é full-screen; na tela de login não há cabeçalho.
  if (pathname.startsWith('/musica/') || pathname.startsWith('/entrar')) return null

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      {/* fio de luz no rodapé do cabeçalho */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px fio-de-luz opacity-70" />

      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 pt-safe sm:h-16 sm:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5 no-tap-highlight">
          <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25 transition-transform duration-300 group-hover:scale-105">
            <ClaveDeSolMarca className="size-6" />
            <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold leading-tight sm:text-base">
              Pasta de <span className="texto-latao">Músicas</span>
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              Seu repertório em qualquer dispositivo
            </span>
          </span>
        </Link>

        {/* Navegação com rótulos a partir de tablet */}
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {LINKS.map(({ href, rotulo, icone: Icone }) => {
            const ativo = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  ativo
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Icone className="size-4" />
                {rotulo}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          {/* Navegação só com ícones no celular */}
          <nav className="flex items-center gap-0.5 md:hidden">
            {LINKS.map(({ href, rotulo, icone: Icone }) => {
              const ativo = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'size-9 rounded-lg',
                        ativo && 'bg-primary/15 text-primary',
                      )}
                    >
                      <Link href={href} aria-label={rotulo}>
                        <Icone className="size-5" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{rotulo}</TooltipContent>
                </Tooltip>
              )
            })}
          </nav>

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

          <BotaoAtalhos />

          {carregando && !usuario && (
            <span
              className="size-9 animate-pulse rounded-full bg-muted sm:size-10"
              aria-hidden
            />
          )}

          {usuario && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-lg sm:size-10"
                  aria-label="Menu do usuário"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-xs font-semibold uppercase text-primary">
                    {usuario.nome?.slice(0, 2) || usuario.email.slice(0, 2)}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-medium">{usuario.nome}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {usuario.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <LayoutGrid className="size-4" />
                    Catálogo
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/manutencao">
                    <Wrench className="size-4" />
                    Manutenção
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void sair()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
