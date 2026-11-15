/**
 * Sobe o build de produção (output: standalone).
 *
 * O Next gera o servidor em `.next/standalone`, mas os arquivos estáticos
 * (`.next/static`) e a pasta `public/` ficam fora dele. Este script copia
 * ambos para dentro — o mesmo que o Dockerfile faz — e sobe o servidor.
 *
 *   npm run build && npm start
 */
import { cp, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const raiz = dirname(dirname(fileURLToPath(import.meta.url)))
const standalone = join(raiz, '.next', 'standalone')

if (!existsSync(standalone)) {
  console.error('[start] Rode `npm run build` antes.')
  process.exit(1)
}

await mkdir(join(standalone, '.next'), { recursive: true })

for (const [origem, destino] of [
  [join(raiz, '.next', 'static'), join(standalone, '.next', 'static')],
  [join(raiz, 'public'), join(standalone, 'public')],
]) {
  if (!existsSync(origem)) continue
  await cp(origem, destino, { recursive: true })
  console.log(`[start] copiado ${origem} -> ${destino}`)
}

const servidor = spawn('node', [join(standalone, 'server.js')], {
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT ?? '3000', HOSTNAME: '0.0.0.0' },
})

servidor.on('exit', (codigo) => process.exit(codigo ?? 0))
