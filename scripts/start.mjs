/**
 * Sobe o build de produção (output: standalone).
 *
 * O Next gera o servidor em `.next/standalone`, mas os arquivos estáticos
 * (`.next/static`) e a pasta `public/` ficam fora dele. Este script copia
 * ambos para dentro — o mesmo que o Dockerfile faz — e sobe o servidor.
 *
 * Também carrega o `.env.local` no ambiente do processo: o servidor
 * standalone muda o diretório de trabalho para `.next/standalone` e, sem
 * isso, não encontraria o arquivo de variáveis (erro "FIREBASE_PROJECT_ID
 * ausente").
 *
 *   npm run build && npm start
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { cp } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = dirname(dirname(fileURLToPath(import.meta.url)))
const standalone = join(raiz, '.next', 'standalone')

if (!existsSync(standalone)) {
  console.error('[start] Rode `npm run build` antes.')
  process.exit(1)
}

/* ------------------------------------------------- variáveis de ambiente */
function carregarEnvLocal() {
  const caminho = join(raiz, '.env.local')
  if (!existsSync(caminho)) return {}
  const valores = {}
  for (const linha of readFileSync(caminho, 'utf-8').split('\n')) {
    if (!linha.trim() || linha.trim().startsWith('#')) continue
    const separador = linha.indexOf('=')
    if (separador < 1) continue
    const nome = linha.slice(0, separador).trim()
    const valor = linha
      .slice(separador + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1')
      .replace(/\\n/g, '\n')
    valores[nome] = valor
  }
  return valores
}

const env = { ...process.env, ...carregarEnvLocal() }

/* ------------------------------------------------------ arquivos estáticos */
mkdirSync(join(standalone, '.next'), { recursive: true })

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
  env: { ...env, PORT: process.env.PORT ?? '3000', HOSTNAME: '0.0.0.0' },
})

servidor.on('exit', (codigo) => process.exit(codigo ?? 0))
