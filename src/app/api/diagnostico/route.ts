import { NextResponse } from 'next/server'

import { diagnosticar } from '@/lib/firebase/diagnostico'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Diagnóstico da configuração do Firebase.
 *
 *   GET /api/diagnostico
 *
 * Não expõe nenhum segredo (só tamanho, formato e prefixo mascarado) e serve
 * para descobrir o que está errado quando o deploy não consegue ler os dados.
 */
export async function GET() {
  try {
    const resultado = await diagnosticar()
    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 503 })
  } catch (erro) {
    return NextResponse.json(
      {
        ok: false,
        erro: erro instanceof Error ? erro.message : String(erro),
        dica: 'Falha ao executar o diagnóstico.',
      },
      { status: 500 },
    )
  }
}
