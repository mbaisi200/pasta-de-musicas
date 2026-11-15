import { NextResponse } from 'next/server'

import { criarConta, totalDeContas } from '@/lib/firebase/contas'

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

  let total = 0
  try {
    total = await totalDeContas()
  } catch {
    return NextResponse.json(
      {
        erro:
          'O Authentication não está habilitado neste projeto. Ative em ' +
          'Firebase Console → Authentication → Começar → E-mail/Senha.',
      },
      { status: 503 },
    )
  }

  if (total > 0) {
    return NextResponse.json(
      { erro: 'O cadastro está fechado. Peça a um administrador para criar sua conta.' },
      { status: 403 },
    )
  }

  try {
    const conta = await criarConta(email, senha, nome)
    return NextResponse.json({ uid: conta.localId, email: conta.email }, { status: 201 })
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'Falha ao criar a conta.'
    const amigavel = /EMAIL_EXISTS/i.test(mensagem)
      ? 'Já existe uma conta com esse e-mail.'
      : /CONFIGURATION_NOT_FOUND/i.test(mensagem)
        ? 'O Authentication ainda não foi ativado neste projeto do Firebase.'
        : /WEAK_PASSWORD|PASSWORD_POLICY/i.test(mensagem)
          ? 'Senha fraca demais. Use ao menos 6 caracteres.'
          : mensagem
    return NextResponse.json({ erro: amigavel }, { status: 400 })
  }
}

/** Quantas contas existem — o front usa isso para mostrar ou esconder o cadastro. */
export async function GET() {
  try {
    return NextResponse.json({ total: await totalDeContas() })
  } catch {
    return NextResponse.json({ total: 0, autenticacaoAtiva: false })
  }
}
