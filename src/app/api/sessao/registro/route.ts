import { NextResponse } from 'next/server'

import { getAuth } from '@/lib/firebase/admin'
import { totalDeUsuarios } from '@/lib/sessao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cadastro de conta.
 *
 * Regra: o **primeiro** usuário do projeto pode se cadastrar livremente
 * (é o administrador). Depois disso, o cadastro fica fechado e só o
 * administrador cria novos usuários (em /manutencao → Usuários).
 */
export async function POST(request: Request) {
  let email = ''
  let senha = ''
  let nome = ''
  try {
    const corpo = await request.json()
    email = String(corpo?.email ?? '').trim().toLowerCase()
    senha = String(corpo?.senha ?? '')
    nome = String(corpo?.nome ?? '').trim()
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (!email || !email.includes('@')) {
    return NextResponse.json({ erro: 'Informe um e-mail válido.' }, { status: 422 })
  }
  if (senha.length < 6) {
    return NextResponse.json({ erro: 'A senha precisa ter ao menos 6 caracteres.' }, { status: 422 })
  }

  const total = await totalDeUsuarios()
  if (total > 0) {
    return NextResponse.json(
      { erro: 'O cadastro está fechado. Peça a um administrador para criar sua conta.' },
      { status: 403 },
    )
  }

  try {
    const usuario = await getAuth().createUser({
      email,
      password: senha,
      displayName: nome || undefined,
    })
    return NextResponse.json({ uid: usuario.uid, email: usuario.email }, { status: 201 })
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'Falha ao criar a conta.'
    const amigavel = /already exists/i.test(mensagem)
      ? 'Já existe uma conta com esse e-mail.'
      : mensagem
    return NextResponse.json({ erro: amigavel }, { status: 400 })
  }
}

/** Quantas contas existem — o front usa isso para mostrar ou esconder o cadastro. */
export async function GET() {
  return NextResponse.json({ total: await totalDeUsuarios() })
}
