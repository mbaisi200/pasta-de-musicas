/**
 * Importador: leva as músicas do app original em Visual FoxPro para a nuvem.
 *
 *   npm run import:vfp -- --dry-run     # só mostra o que será importado
 *   npm run import:vfp -- --local       # grava em .data/ (dev/demo, sem Firebase)
 *   npm run import:vfp                  # sobe para o Firestore + Storage
 *
 * Origem dos dados (ajuste com LEGACY_VFP_DIR):
 *   ../MusicaIvan/Músicas_Demo_copia/músicas.DBF
 *   ../MusicaIvan/Músicas_Demo_copia/AJUDA.DBF
 *   ../MusicaIvan/Músicas_Demo_copia/PDF/*.pdf
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

import { lerDbf } from './dbf'

/** Limite do Firestore (1 MiB por documento) — base64 cresce ~33%. */
const TAMANHO_MAXIMO_PDF = 700 * 1024

/**
 * Carrega o `.env.local` (o Next.js carrega sozinho, mas um script solto não).
 * As variáveis já presentes no ambiente têm prioridade.
 */
function carregarEnvLocal() {
  const caminho = join(process.cwd(), '.env.local')
  if (!existsSync(caminho)) return
  for (const linha of readFileSync(caminho, 'utf-8').split('\n')) {
    const separador = linha.indexOf('=')
    if (separador < 1 || linha.trim().startsWith('#')) continue
    const nome = linha.slice(0, separador).trim()
    if (process.env[nome]) continue
    const valor = linha
      .slice(separador + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1')
      .replace(/\\n/g, '\n')
    process.env[nome] = valor
  }
}

carregarEnvLocal()

/* ------------------------------------------------------------------ args */
const argumentos = process.argv.slice(2)
const dryRun = argumentos.includes('--dry-run')
const local = argumentos.includes('--local')

/* --------------------------------------------------------------- helpers */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.(pdf|docx?)$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const PALAVRAS_INSTRUMENTO = [
  'teclado',
  'baixo',
  'trumpete',
  'trumpet',
  'piano',
  'violao',
  'violino',
  'flauta',
  'bateria',
  'sax',
  'guitarra',
  'contrabaixo',
  'violoncelo',
  'letra',
  'cifra',
  'partitura',
  'real book',
  'letras',
  'cifras',
]

function instrumentoDaMusica(registro: Record<string, string>): string {
  const bruto = (registro.INSTRUMENT ?? '').toLowerCase()
  const encontrado = PALAVRAS_INSTRUMENTO.find((p) => bruto.includes(p))
  return encontrado ?? ''
}

/* --------------------------------------------------------------- origem */
const RAIZ = resolve(process.cwd())
const PASTA_VFP =
  process.env.LEGACY_VFP_DIR ?? resolve(RAIZ, '..', 'MusicaIvan', 'Músicas_Demo_copia')
const ARQ_MUSICAS = join(PASTA_VFP, 'músicas.DBF')
const ARQ_AJUDA = join(PASTA_VFP, 'AJUDA.DBF')
const PASTA_PDF = join(PASTA_VFP, 'PDF')

if (!existsSync(ARQ_MUSICAS)) {
  console.error(`[import] Tabela de músicas não encontrada em: ${ARQ_MUSICAS}`)
  console.error('[import] Ajuste a pasta com a variável LEGACY_VFP_DIR.')
  process.exit(1)
}

/* --------------------------------------------------------------- leitura */
const { registros } = lerDbf(ARQ_MUSICAS)

let configuracoes: Record<string, string> = {}
if (existsSync(ARQ_AJUDA)) {
  const ajuda = lerDbf(ARQ_AJUDA)
  const registrosAjuda = ajuda.registros
  if (registrosAjuda.length > 0) {
    configuracoes = { ...registrosAjuda[0] }
  }
}

/* ------------------------------------------------------ índice de PDFs */
const arquivosPdf = existsSync(PASTA_PDF)
  ? readdirSync(PASTA_PDF).filter((f) => extname(f).toLowerCase() === '.pdf')
  : []
const indicePdf = new Map(arquivosPdf.map((f) => [normalizar(f), f]))

/** Último segmento de um caminho — aceita separadores Windows e Unix. */
function ultimoSegmento(caminho: string): string {
  const partes = caminho.split(/[\\/]/)
  return partes[partes.length - 1] ?? caminho
}

/** Similaridade simples entre dois nomes (0..1). */
function similaridade(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return 0.9
  const distancia = levenshtein(a, b)
  return 1 - distancia / Math.max(a.length, b.length)
}

function levenshtein(a: string, b: string): number {
  const linha = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let anterior = linha[0]
    linha[0] = i
    for (let j = 1; j <= b.length; j++) {
      const atual = linha[j]
      const custo = a[i - 1] === b[j - 1] ? 0 : 1
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, anterior + custo)
      anterior = atual
    }
  }
  return linha[b.length]
}

function acharPdf(musica: string, instrumento: string, caminhoOriginal: string): string | null {
  // 1) Correspondência exata com o basename gravado no VFP
  const alvo = normalizar(ultimoSegmento(caminhoOriginal))
  if (indicePdf.has(alvo)) return indicePdf.get(alvo)!

  // 2) Correspondência aproximada: nome da música + tipo (ex.: "Misty" + "Baixo")
  const [baseMusica, ...restoMusica] = musica.split('-')
  const sufixoMusica = normalizar(restoMusica.join('-'))
  const palavra = instrumentoDaMusica({ INSTRUMENT: instrumento })

  const pontuados = arquivosPdf
    .map((arquivo) => {
      const semExtensao = arquivo.replace(/\.pdf$/i, '')
      const [baseArquivo, ...restoArquivo] = semExtensao.split('-')
      const sufixoArquivo = normalizar(restoArquivo.join('-'))

      const base = similaridade(normalizar(baseMusica), normalizar(baseArquivo))
      if (base < 0.6) return null

      let pontos = base * 60
      if (sufixoMusica && sufixoArquivo) {
        pontos += similaridade(sufixoMusica, sufixoArquivo) > 0.7 ? 30 : -20
      }
      if (palavra && normalizar(arquivo).includes(palavra)) pontos += 15
      // Em empate, prefere o nome mais curto (ex.: "Misty.pdf" > "Misty - Baixo.pdf")
      pontos -= 0.5 * restoArquivo.length

      return { arquivo, pontos }
    })
    .filter((p): p is { arquivo: string; pontos: number } => p !== null)
    .sort((a, b) => b.pontos - a.pontos)

  return pontuados.length > 0 && pontuados[0].pontos >= 45 ? pontuados[0].arquivo : null
}

/* ------------------------------------------------------------ montagem */
interface MusicaImportada {
  musica: string
  autor: string
  grupo: string
  estilo: string
  instrumento: string
  observacao: string
  ordem: number
  rolamento: boolean
  velocidade: number
  arquivo: { nome: string; caminho: string; tamanho: number; tipo: string } | null
}

const agora = new Date().toISOString()
const importadas: MusicaImportada[] = []
const semPdf: string[] = []

for (const registro of registros) {
  const nomeMusica = (registro['MÚSICA'] ?? registro['MUSICA'] ?? '').trim()
  if (!nomeMusica) continue

  const arquivoOriginal = (registro.PDF ?? '').trim()
  const encontrado = arquivoOriginal ? acharPdf(nomeMusica, registro.INSTRUMENT ?? '', arquivoOriginal) : null

  if (encontrado) {
    const caminho = join(PASTA_PDF, encontrado)
    importadas.push({
      musica: nomeMusica,
      autor: (registro.AUTOR ?? '').trim(),
      grupo: (registro.GRUPO ?? '').trim(),
      estilo: (registro.ESTILO ?? '').trim(),
      instrumento: (registro.INSTRUMENT ?? '').trim(),
      observacao: (registro['OBSERVAÇÕE'] ?? registro['OBSERVACAO'] ?? '').trim(),
      ordem: Number(registro.ORDEM ?? 0) || 0,
      rolamento: (registro.ROLAMENTO ?? 'F').toUpperCase() === 'T',
      velocidade: Number(registro.VELOCIDADE ?? 0) || 0,
      arquivo: {
        nome: encontrado,
        caminho: `musicas/PENDENTE/${encontrado}`,
        tamanho: readFileSync(caminho).length,
        tipo: 'application/pdf',
      },
    })
  } else {
    semPdf.push(nomeMusica)
    importadas.push({
      musica: nomeMusica,
      autor: (registro.AUTOR ?? '').trim(),
      grupo: (registro.GRUPO ?? '').trim(),
      estilo: (registro.ESTILO ?? '').trim(),
      instrumento: (registro.INSTRUMENT ?? '').trim(),
      observacao: (registro['OBSERVAÇÕE'] ?? registro['OBSERVACAO'] ?? '').trim(),
      ordem: Number(registro.ORDEM ?? 0) || 0,
      rolamento: (registro.ROLAMENTO ?? 'F').toUpperCase() === 'T',
      velocidade: Number(registro.VELOCIDADE ?? 0) || 0,
      arquivo: null,
    })
  }
}

console.log(`[import] ${importadas.length} músicas lidas de ${PASTA_VFP}`)
console.log(`[import] ${importadas.length - semPdf.length} com PDF encontrado`)
if (semPdf.length > 0) console.log(`[import] sem PDF: ${semPdf.join(', ')}`)

if (dryRun) {
  console.table(
    importadas.map((m) => ({
      música: m.musica,
      autor: m.autor,
      setlist: m.grupo,
      estilo: m.estilo,
      instrumento: m.instrumento,
      ordem: m.ordem,
      pdf: m.arquivo?.nome ?? '—',
    })),
  )
  process.exit(0)
}

/* ------------------------------------------------------------ configuração */
/** O campo `VERSÃO` do VFP guardava o equipamento (Micro / Tablet / Celular). */
function equipamentoDoVfp(valor: string): 'micro' | 'tablet' | 'celular' {
  const normalizado = valor.trim().toLowerCase()
  if (normalizado.startsWith('tab')) return 'tablet'
  if (normalizado.startsWith('cel')) return 'celular'
  return 'micro'
}

function configuracoesDoVfp(): Record<string, string> {
  return {
    ajuda: configuracoes.AJUDA ?? '',
    mensagem: configuracoes.MENSAGEM ?? '',
    nome: configuracoes.NOME ?? 'Ivan Sampaio',
    email: configuracoes.EMAIL ?? 'sampaioivan@gmail.com',
    versao: '1.0',
    instrumentoPadrao: configuracoes.INSTRUMENT ?? 'Teclado',
    equipamento: equipamentoDoVfp(configuracoes['VERSÃO'] ?? configuracoes['VERSAO'] ?? ''),
  }
}

/* --------------------------------------------------------------- escrita */
async function main() {
  if (local) {
    gravarLocal()
    return
  }
  await gravarFirebase()
}

/** Modo local: popula `.data/` para rodar sem Firebase. */
function gravarLocal() {
  const dirDados = join(RAIZ, '.data')
  const dirArquivos = join(dirDados, 'arquivos')
  mkdirSync(dirArquivos, { recursive: true })

  const musicas = importadas.map((m, indice) => {
    const id = `vfp-${String(indice + 1).padStart(3, '0')}`
    let arquivo = null
    if (m.arquivo) {
      const destinoDir = join(dirArquivos, id)
      mkdirSync(destinoDir, { recursive: true })
      const origem = join(PASTA_PDF, m.arquivo.nome)
      writeFileSync(join(destinoDir, m.arquivo.nome), readFileSync(origem))
      arquivo = {
        nome: m.arquivo.nome,
        caminho: join('arquivos', id, m.arquivo.nome),
        tamanho: m.arquivo.tamanho,
        tipo: 'application/pdf',
      }
    }
    return {
      id,
      musica: m.musica,
      autor: m.autor,
      grupo: m.grupo,
      estilo: m.estilo,
      instrumento: m.instrumento,
      arquivo,
      rolamento: m.rolamento,
      velocidade: m.velocidade,
      observacao: m.observacao,
      ordem: m.ordem,
      createdAt: agora,
      updatedAt: agora,
    }
  })

  writeFileSync(join(dirDados, 'musicas.json'), JSON.stringify(musicas, null, 2), 'utf-8')

  const config = configuracoesDoVfp()
  writeFileSync(join(dirDados, 'configuracoes.json'), JSON.stringify(config, null, 2), 'utf-8')

  console.log(`[import] gravado em ${dirDados} (${musicas.length} músicas)`)
}

/** Modo Firebase: sobe para o Firestore (PDF embutido em base64). */
async function gravarFirebase() {
  const { cert, initializeApp } = await import('firebase-admin/app')
  const { getFirestore } = await import('firebase-admin/firestore')

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    console.error('[import] Firebase não configurado. Use --local ou preencha o .env.local.')
    process.exit(1)
  }

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
  const db = getFirestore(app)
  const colecao = db.collection('musicas')

  let criadas = 0
  let semEspaco = 0

  for (const [indice, m] of importadas.entries()) {
    const id = `vfp-${String(indice + 1).padStart(3, '0')}`
    let arquivo = null

    if (m.arquivo) {
      const origem = join(PASTA_PDF, m.arquivo.nome)
      const buffer = readFileSync(origem)
      if (buffer.length > TAMANHO_MAXIMO_PDF) {
        console.warn(
          `\n[import] "${m.musica}" (${m.arquivo.nome}) tem ${Math.round(buffer.length / 1024)} KB — ` +
            `acima do limite de ${Math.round(TAMANHO_MAXIMO_PDF / 1024)} KB. Partitura SEM PDF.`,
        )
        semEspaco += 1
      } else {
        const dados = buffer.toString('base64')
        await colecao.doc(id).collection('partitura').doc('atual').set({
          nome: m.arquivo.nome,
          tamanho: buffer.length,
          tipo: 'application/pdf',
          dados,
        })
        arquivo = {
          nome: m.arquivo.nome,
          caminho: `musicas/${id}/partitura/atual`,
          tamanho: buffer.length,
          tipo: 'application/pdf',
        }
      }
    }

    await colecao.doc(id).set({
      ...m,
      arquivo,
      createdAt: agora,
      updatedAt: agora,
    })
    criadas += 1
    process.stdout.write(`\r[import] gravando... ${criadas}/${importadas.length}`)
  }

  await db.collection('configuracoes').doc('app').set(
    {
      ...configuracoesDoVfp(),
      atualizadoEm: agora,
    },
    { merge: true },
  )

  console.log(`\n[import] ${criadas} músicas gravadas no Firestore.`)
  if (semEspaco > 0) {
    console.log(
      `[import] ${semEspaco} música(s) ficaram sem PDF (acima de ${Math.round(TAMANHO_MAXIMO_PDF / 1024)} KB).`,
    )
  }
}

main().catch((erro) => {
  console.error('[import] falhou:', erro)
  process.exit(1)
})
