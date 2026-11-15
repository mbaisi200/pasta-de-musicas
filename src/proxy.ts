import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy (antigo `middleware`) — protege as telas do app.
 *
 * A verificação real do cookie acontece no servidor (layout e API); aqui é
 * apenas um portão rápido, para não carregar o Firebase Admin SDK em toda
 * requisição de asset.
 */

const COOKIE = 'pasta_de_musicas_sessao'

const PUBLICOS = [
  '/entrar',
  '/api/sessao',
  '/api/usuarios/primeiro',
  '/manifest.webmanifest',
  '/sw.js',
  '/icons/',
  '/pdf/',
  '/_next/',
  '/favicon',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLICOS.some((prefixo) => pathname.startsWith(prefixo))) {
    return NextResponse.next()
  }

  // A API responde 401 em JSON (não redireciona) — o front trata o 401.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Modo desenvolvimento (SKIP_AUTH=1) — nunca em produção.
  if (process.env.SKIP_AUTH === '1' && process.env.NODE_ENV !== 'production') {
    return NextResponse.next()
  }

  const sessao = request.cookies.get(COOKIE)?.value
  if (sessao) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = '/entrar'
  url.search = `?proximo=${encodeURIComponent(pathname + request.nextUrl.search)}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js|pdf).*)'],
}
