'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { signOut as firebaseSignOut } from 'firebase/auth'

import { firebaseConfigurado, getAuthClient } from '@/lib/firebase/client'

/**
 * Sessão do usuário no navegador.
 *
 * O login acontece direto com o Firebase Auth (Web SDK); depois o ID token é
 * trocado por um session cookie httpOnly no servidor (POST /api/sessao).
 * A partir daí, o app inteiro depende do cookie — o navegador não guarda
 * credencial nenhuma.
 */

export interface UsuarioCliente {
  email: string
  nome: string
}

interface ContextoAuth {
  usuario: UsuarioCliente | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<void>
  registrar: (email: string, senha: string, nome: string) => Promise<void>
  sair: () => Promise<void>
}

const Contexto = React.createContext<ContextoAuth | null>(null)

export function ProvedorAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [usuario, setUsuario] = React.useState<UsuarioCliente | null>(null)
  const [carregando, setCarregando] = React.useState(true)

  // Ao abrir o app, pergunta ao servidor se ainda há sessão válida.
  React.useEffect(() => {
    let cancelado = false
    async function verificar() {
      try {
        const resposta = await fetch('/api/sessao/usuario', { cache: 'no-store' })
        if (!resposta.ok) return
        const dados = await resposta.json()
        if (!cancelado && dados?.usuario) setUsuario(dados.usuario)
      } catch {
        /* sem sessão */
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }
    verificar()
    return () => {
      cancelado = true
    }
  }, [])

  async function entrar(email: string, senha: string) {
    // Login pelo servidor (Identity Toolkit admin): não depende do Web SDK
    // e funciona mesmo antes de a API key do console existir.
    const resposta = await fetch('/api/sessao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    })
    const dados = await resposta.json().catch(() => ({}))
    if (!resposta.ok) throw new Error(dados?.erro ?? 'Não foi possível entrar.')
    setUsuario(dados.usuario ?? { email, nome: email })
  }

  async function registrar(email: string, senha: string, nome: string) {
    // A conta é criada no servidor (só o primeiro usuário pode se cadastrar).
    const resposta = await fetch('/api/sessao/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha, nome }),
    })
    const dados = await resposta.json().catch(() => ({}))
    if (!resposta.ok) throw new Error(dados?.erro ?? 'Não foi possível criar a conta.')

    // Depois de criar, faz login para já abrir o cookie de sessão.
    await entrar(email, senha)
  }

  async function sair() {
    try {
      if (firebaseConfigurado()) await firebaseSignOut(getAuthClient())
    } catch {
      /* ignora */
    }
    await fetch('/api/sessao', { method: 'DELETE' })
    setUsuario(null)
    router.replace('/entrar')
    router.refresh()
  }

  return (
    <Contexto.Provider value={{ usuario, carregando, entrar, registrar, sair }}>
      {children}
    </Contexto.Provider>
  )
}

export function useAuth(): ContextoAuth {
  const contexto = React.useContext(Contexto)
  if (!contexto) throw new Error('useAuth precisa estar dentro de ProvedorAuth')
  return contexto
}

/** Verdadeiro quando o Firebase Web SDK não está configurado no ambiente. */
export function authNaoConfigurado(): boolean {
  return !firebaseConfigurado()
}
