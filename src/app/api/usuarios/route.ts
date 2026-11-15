import { NextResponse } from 'next/server'

import { getAuth } from '@/lib/firebase/admin'
import { usuarioDaRequisicao } from '@/lib/sessao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Lista os usuários do projeto (somente administrador). */
export async function GET() {
  const usuario = await usuarioDaRequisicao()
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  if (!usuario.admin) {
    return NextResponse.json({ erro: 'Apenas administradores.' }, { status: 403 })
  }

  try {
    const lista = await getAuth().listUsers(1000)
    const usuarios = lista.users.map((u) => ({
      uid: u.uid,
      email: u.email ?? '',
      nome: u.displayName ?? u.email ?? 'Usuário',
      criadoEm: u.metadata.creationTime,
      ultimoAcesso: u.metadata.lastSignInTime,
      desativado: u.disabled,
    }))
    return NextResponse.json({ usuarios })
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : 'Falha ao listar usuários.' },
      { status: 500 },
    )
  }
}

/** Cria um novo usuário (somente administrador). */
export async function POST(request: Request) {
  const usuario = await usuarioDaRequisicao()
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  if (!usuario.admin) {
    return NextResponse.json({ erro: 'Apenas administradores.' }, { status: 403 })
  }

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

  if (!email.includes('@')) {
    return NextResponse.json({ erro: 'Informe um e-mail válido.' }, { status: 422 })
  }
  if (senha.length < 6) {
    return NextResponse.json({ erro: 'A senha precisa ter ao menos 6 caracteres.' }, { status: 422 })
  }

  try {
    const criado = await getAuth().createUser({
      email,
      password: senha,
      displayName: nome || undefined,
    })
    return NextResponse.json({ uid: criado.uid, email: criado.email }, { status: 201 })
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'Falha ao criar o usuário.'
    return NextResponse.json(
      { erro: /already exists/i.test(mensagem) ? 'Já existe uma conta com esse e-mail.' : mensagem },
      { status: 400 },
    )
  }
}

/** Exclui (ou desativa) um usuário. */
export async function DELETE(request: Request) {
  const usuario = await usuarioDaRequisicao()
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  if (!usuario.admin) {
    return NextResponse.json({ erro: 'Apenas administradores.' }, { status: 403 })
  }

  let uid = ''
  try {
    const corpo = await request.json()
    uid = String(corpo?.uid ?? '')
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (!uid) return NextResponse.json({ erro: 'uid ausente.' }, { status: 400 })
  if (uid === usuario.uid) {
    return NextResponse.json({ erro: 'Você não pode excluir a própria conta.' }, { status: 422 })
  }

  try {
    await getAuth().deleteUser(uid)
    return NextResponse.json({ ok: true })
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : 'Falha ao excluir.' },
      { status: 400 },
    )
  }
}
