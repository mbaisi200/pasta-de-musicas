// Copia o worker do pdf.js para /public para que o react-pdf funcione em runtime.
// Executado automaticamente no postinstall.
import { copyFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const origem = join(root, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs')
const destinoDir = join(root, 'public', 'pdf')
const destino = join(destinoDir, 'pdf.worker.min.mjs')

if (!existsSync(origem)) {
  console.warn('[pdf-worker] pdfjs-dist não encontrado — pulando cópia.')
  process.exit(0)
}

await mkdir(destinoDir, { recursive: true })
await copyFile(origem, destino)
console.log('[pdf-worker] worker do pdf.js copiado para public/pdf/pdf.worker.min.mjs')
