'use client'

import * as React from 'react'

/**
 * Tema claro/escuro. O padrão é o escuro (visual de palco), com persistência
 * em localStorage. A aplicação do tema acontece antes da pintura inicial
 * (script inline no layout) para evitar "flash" branco.
 *
 * `useSyncExternalStore` é usado no lugar de `useState` + `useEffect` para
 * não haver divergência entre o HTML do servidor e o do cliente.
 */
export type Tema = 'claro' | 'escuro'

const CHAVE = 'pasta-de-musicas:tema'
const EVENTO = 'pasta-de-musicas:tema:alterado'

function lerTema(): Tema {
  if (typeof window === 'undefined') return 'escuro'
  try {
    const salvo = window.localStorage.getItem(CHAVE)
    if (salvo === 'claro' || salvo === 'escuro') return salvo
  } catch {
    /* modo privativo */
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'escuro'
}

function assinarTema(callback: () => void): () => void {
  window.addEventListener(EVENTO, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENTO, callback)
    window.removeEventListener('storage', callback)
  }
}

export function useTema(): [Tema, (tema: Tema) => void] {
  const tema = React.useSyncExternalStore(assinarTema, lerTema, () => 'escuro' as const)

  // Mantém o <html> sincronizado com o tema (sistema externo).
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'escuro')
    document.documentElement.style.colorScheme = tema
  }, [tema])

  function aplicar(novo: Tema) {
    try {
      window.localStorage.setItem(CHAVE, novo)
    } catch {
      /* modo privativo */
    }
    document.documentElement.classList.toggle('dark', novo === 'escuro')
    document.documentElement.style.colorScheme = novo
    window.dispatchEvent(new Event(EVENTO))
  }

  return [tema, aplicar]
}

/** Script injetado no <head> para evitar flash de tema incorreto. */
export const scriptTema = `(function(){try{var t=localStorage.getItem('${CHAVE}');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'claro':'escuro'}var d=t==='escuro';document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=t}catch(e){document.documentElement.classList.add('dark')}})()`
