import type { Metadata } from 'next'

import { Catalogo } from '@/components/catalogo/catalogo'
import { getRepositorio } from '@/lib/repositorio'
import { exigirUsuario } from '@/lib/sessao'

export const metadata: Metadata = {
  title: 'Músicas',
  description: 'Catálogo de músicas e partituras',
}

export const dynamic = 'force-dynamic'

export default async function PaginaCatalogo() {
  await exigirUsuario()

  const repositorio = getRepositorio()
  const musicas = await repositorio.listarMusicas()

  return <Catalogo musicas={musicas} />
}
