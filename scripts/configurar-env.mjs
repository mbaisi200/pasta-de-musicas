/**
 * Converte a chave JSON da Service Account do Firebase em `.env.local`.
 *
 * Por que existe: a chave privada vem com quebras de linha reais; em arquivos
 * `.env` (e na Vercel) ela precisa ficar em UMA linha com `\n` literais.
 * Fazer isso na mão é o passo onde quase todo mundo erra.
 *
 * Uso:
 *   node scripts/configurar-env.mjs caminho/para/chave-do-firebase.json
 *   node scripts/configurar-env.mjs              # procura na pasta Downloads
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = dirname(dirname(fileURLToPath(import.meta.url)))
const destino = join(raiz, '.env.local')

/* ------------------------------------------------------------- entrada */
const argumento = process.argv[2]
let caminho = argumento ? resolve(argumento) : null

if (!caminho) {
  const pastaDownloads = join(homedir(), 'Downloads')
  const candidatos = existsSync(pastaDownloads)
    ? readdirSync(pastaDownloads)
        .filter((n) => n.endsWith('.json'))
        .filter((n) => /pasta-de-musicas|firebase|service|admin/i.test(n))
        .map((n) => join(pastaDownloads, n))
    : []
  caminho = candidatos[0] ?? null
  if (!caminho) {
    console.error(
      'Informe o caminho do JSON baixado do Firebase:\n' +
        '  node scripts/configurar-env.mjs ~/Downloads/pasta-de-musicas-ivan-xxxxx.json',
    )
    process.exit(1)
  }
}

if (!existsSync(caminho)) {
  console.error(`Arquivo não encontrado: ${caminho}`)
  process.exit(1)
}

let chave
try {
  chave = JSON.parse(readFileSync(caminho, 'utf-8'))
} catch {
  console.error('O arquivo não é um JSON válido.')
  process.exit(1)
}

const projectId = chave.project_id ?? chave.projectId
const clientEmail = chave.client_email ?? chave.clientEmail
const privateKey = chave.private_key ?? chave.privateKey

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    'O JSON não tem os campos esperados (project_id, client_email, private_key).\n' +
      'Baixe a chave em: Firebase Console → ⚙️ Configurações do projeto → Contas de serviço → Gerar nova chave privada.',
  )
  process.exit(1)
}

/* --------------------------------------------------------- escrever */
/** Converte quebras de linha reais na sequência de 2 caracteres `\n`. */
const chaveEscapada = privateKey.replace(/\r\n|\r|\n/g, '\\n').replace(/"/g, '\\"')

const conteudo = `# Gerado por scripts/configurar-env.mjs em ${new Date().toLocaleString('pt-BR')}
# Fonte: ${basename(caminho)}
# NÃO versionar este arquivo (já está no .gitignore).

FIREBASE_PROJECT_ID=${projectId}
FIREBASE_CLIENT_EMAIL=${clientEmail}
FIREBASE_PRIVATE_KEY="${chaveEscapada}"

NEXT_PUBLIC_FIREBASE_PROJECT_ID=${projectId}

NEXT_PUBLIC_APP_URL=http://localhost:3000
`

writeFileSync(destino, conteudo, 'utf-8')

console.log(`✓ ${destino} criado com as credenciais de ${projectId}`)
console.log('  (os PDFs das partituras ficam no Firestore — não é preciso criar bucket)')
