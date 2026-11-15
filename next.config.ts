import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // O AGENTS.md deste projeto é mantido à mão — não gerar automaticamente.
  agentRules: false,

  /**
   * Pacotes que o Next NÃO deve empacotar — resolvidos pelo Node em runtime.
   *
   * O `firebase-admin/auth` carrega `jwks-rsa`, que dá `require()` no `jose`
   * (módulo ESM). Empacotado na Vercel isso quebra com `ERR_REQUIRE_ESM`;
   * marcando como externos, o Node carrega os arquivos reais.
   */
  serverExternalPackages: ['firebase-admin', 'jwks-rsa', 'jose', 'google-auth-library'],
  // Evita que o Turbopack suba para o diretório HOME e se confunda com
  // outros package.json da máquina.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
