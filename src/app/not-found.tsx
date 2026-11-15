import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function PaginaNaoEncontrada() {
  return (
    <div className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <FileQuestion className="size-7" />
      </span>
      <div>
        <h1 className="text-lg font-semibold">Música não encontrada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O link pode ter mudado ou a música foi excluída.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Voltar ao catálogo</Link>
      </Button>
    </div>
  )
}
