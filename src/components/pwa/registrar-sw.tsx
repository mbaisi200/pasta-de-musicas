'use client'

import * as React from 'react'

/** Registra o service worker da PWA (apenas em produção). */
export function RegistrarServiceWorker() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const registrar = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
    }

    if (document.readyState === 'complete') registrar()
    else window.addEventListener('load', registrar)
    return () => window.removeEventListener('load', registrar)
  }, [])

  return null
}
