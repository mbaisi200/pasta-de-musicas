import type { Metadata } from 'next'

import { Manutencao } from '@/components/manutencao/manutencao'
import { getRepositorio } from '@/lib/repositorio'

export const metadata: Metadata = {
  title: 'Manutenção',
  description: 'Cadastrar, alterar e excluir músicas',
}

export const dynamic = 'force-dynamic'

export default async function PaginaManutencao() {
  const musicas = await getRepositorio().listarMusicas()
  return <Manutencao musicas={musicas} />
}
