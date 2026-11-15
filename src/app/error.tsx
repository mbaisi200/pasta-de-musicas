'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
        <AlertTriangle className="size-7" />
      </span>
      <div>
        <h1 className="text-lg font-semibold">Algo deu errado</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Não foi possível carregar esta tela. Tente novamente — se persistir, verifique a
          conexão com o banco de dados.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/">Ir para o catálogo</Link>
        </Button>
        <Button onClick={reset} className="gap-2">
          <RotateCcw className="size-4" />
          Tentar de novo
        </Button>
      </div>
    </div>
  )
}
