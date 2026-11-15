import type { Metadata } from 'next'

import { AjudaConteudo } from '@/components/ajuda/ajuda-conteudo'
import { getRepositorio } from '@/lib/repositorio'
import { exigirUsuario } from '@/lib/sessao'

export const metadata: Metadata = {
  title: 'Ajuda',
  description: 'Ajuda, afinador e metrônomo',
}

export const dynamic = 'force-dynamic'

export default async function PaginaAjuda() {
  await exigirUsuario()

  const configuracoes = await getRepositorio().lerConfiguracoes()
  return <AjudaConteudo configuracoes={configuracoes} />
}
