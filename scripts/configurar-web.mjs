/**
 * Grava a configuração do Firebase Web SDK (login) no `.env.local`.
 *
 * Onde pegar: Firebase Console → Configurações do projeto → Seus apps → Web (</>)
 * → "Configuração do SDK" → copiar o objeto `firebaseConfig` (ou o snippet
 * `const firebaseConfig = { ... }`).
 *
 * Uso (cole o JSON e pressione Ctrl+D):
 *
 *   node scripts/configurar-web.mjs
 *
 * ...ou com o arquivo:
 *
 *   node scripts/configurar-web.mjs ~/Downloads/firebase-config.json
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = dirname(dirname(fileURLToPath(import.meta.url)))
const destino = join(raiz, '.env.local')

/* --------------------------------------------------------------- entrada */
async function lerEntrada() {
  const argumento = process.argv[2]
  if (argumento && existsSync(resolve(argumento))) {
    return readFileSync(resolve(argumento), 'utf-8')
  }
  const texto = await new Promise((resolveTexto) => {
    let acumulado = ''
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', (pedaco) => (acumulado += pedaco))
    process.stdin.on('end', () => resolveTexto(acumulado))
    process.stdin.on('error', () => resolveTexto(acumulado))
  })
  return texto
}

const bruto = await lerEntrada()

// aceita o snippet "const firebaseConfig = { ... }" ou só o objeto
const inicio = bruto.indexOf('{')
const fim = bruto.lastIndexOf('}')
if (inicio < 0 || fim < 0) {
  console.error('Não encontrei um objeto JSON na entrada.')
  console.error('Cole o bloco `firebaseConfig = { ... }` do console do Firebase.')
  process.exit(1)
}

let config
try {
  config = JSON.parse(bruto.slice(inicio, fim + 1))
} catch {
  console.error('O JSON informado é inválido.')
  process.exit(1)
}

const variaveis = {
  NEXT_PUBLIC_FIREBASE_API_KEY: config.apiKey ?? '',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: config.authDomain ?? '',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: config.projectId ?? '',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: config.storageBucket ?? '',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId ?? '',
  NEXT_PUBLIC_FIREBASE_APP_ID: config.appId ?? '',
}

const faltando = Object.entries(variaveis)
  .filter(([, valor]) => !valor)
  .map(([nome]) => nome)
if (faltando.length > 0) {
  console.error(`Faltaram campos no objeto: ${faltando.join(', ')}`)
  process.exit(1)
}

/* --------------------------------------------------------------- escrita */
let conteudo = existsSync(destino) ? readFileSync(destino, 'utf-8') : ''

for (const [nome, valor] of Object.entries(variaveis)) {
  const linha = `${nome}=${valor}`
  const padrao = new RegExp(`^${nome}=.*$`, 'm')
  conteudo = padrao.test(conteudo)
    ? conteudo.replace(padrao, linha)
    : `${conteudo.trimEnd()}\n${linha}\n`
}

writeFileSync(destino, conteudo, 'utf-8')

console.log(`✓ ${destino} atualizado com a configuração do Firebase Web SDK.`)
console.log('  Reinicie o servidor de desenvolvimento para aplicar.')
