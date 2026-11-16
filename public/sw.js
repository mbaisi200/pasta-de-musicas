/*
 * Service worker da Pasta de Músicas.
 *
 * Estratégia:
 *  - navegação (HTML): rede primeiro, cache como reserva (offline)
 *  - assets estáticos do Next (/_next/static): cache primeiro (imutáveis)
 *  - PDFs da partitura: rede primeiro com cache (partitura já tocada funciona offline)
 */

const VERSAO = 'v2'
const CACHE_SHELL = `pasta-musicas-shell-${VERSAO}`
const CACHE_ASSETS = `pasta-musicas-assets-${VERSAO}`
const CACHE_PDF = `pasta-musicas-pdf-${VERSAO}`

const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves
            .filter((chave) => ![CACHE_SHELL, CACHE_ASSETS, CACHE_PDF].includes(chave))
            .map((chave) => caches.delete(chave)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function daRedeComReserva(request, cacheName) {
  return fetch(request)
    .then((resposta) => {
      if (resposta && resposta.status === 200 && resposta.type === 'basic') {
        const copia = resposta.clone()
        caches.open(cacheName).then((cache) => cache.put(request, copia))
      }
      return resposta
    })
    .catch(() => caches.match(request).then((cacheado) => cacheado || caches.match('/')))
}

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Partituras em PDF
  if (url.pathname.startsWith('/api/musicas/') && url.pathname.endsWith('/pdf')) {
    evento.respondWith(daRedeComReserva(request, CACHE_PDF))
    return
  }

  // Navegação
  if (request.mode === 'navigate') {
    evento.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone()
          caches.open(CACHE_SHELL).then((cache) => cache.put('/', copia))
          return resposta
        })
        .catch(() => caches.match('/').then((cacheado) => cacheado || Response.error())),
    )
    return
  }

  // Assets estáticos (hash no nome — imutáveis)
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    evento.respondWith(
      caches.match(request).then(
        (cacheado) =>
          cacheado ||
          fetch(request).then((resposta) => {
            const copia = resposta.clone()
            caches.open(CACHE_ASSETS).then((cache) => cache.put(request, copia))
            return resposta
          }),
      ),
    )
  }
})
