/**
 * Regras de leitura da partitura (sem DOM, sem Node).
 *
 * Recebe as "linhas" extraídas do PDF (texto + tamanho da fonte + posição)
 * e deduz o que dá para deduzir de uma partitura:
 *
 *   - **título**: a linha com a maior fonte (o nome da música é quase sempre
 *     o texto mais grande da página);
 *   - **autor**: linha entre parênteses, depois de "por", ou logo abaixo do
 *     título;
 *   - **instrumento**: as partituras do app original têm "Trumpete", "Teclado",
 *     "Baixo" escritos na própria partitura — basta procurar no texto;
 *   - **estilo**: por palavras-chave (Jazz, MPB, Bossa...).
 *
 * Tudo aqui é *sugestão*: o usuário confirma antes de gravar.
 */

export interface LinhaPdf {
  texto: string
  /** Tamanho da fonte (em pontos). */
  altura: number
  /** Posição vertical (y). */
  y: number
  /** Posição horizontal (x). */
  x: number
}

export interface AnalisePartitura {
  titulo: string
  autor: string
  instrumento: string
  estilo: string
  paginas: number
}

/* --------------------------------------------------------- instrumentos */
const INSTRUMENTOS: { termos: string[]; valor: string }[] = [
  { termos: ['trumpete', 'trumpet'], valor: 'Trumpete' },
  { termos: ['teclado', 'teclas', 'piano'], valor: 'Teclado' },
  { termos: ['contrabaixo'], valor: 'Contrabaixo' },
  { termos: ['baixo', 'bass'], valor: 'Baixo' },
  { termos: ['violão', 'violao', 'guitarra', 'guitar'], valor: 'Violão' },
  { termos: ['flauta', 'flute'], valor: 'Flauta' },
  { termos: ['bateria', 'drums', 'percussão', 'percussao'], valor: 'Bateria' },
  { termos: ['saxofone', 'sax'], valor: 'Saxofone' },
  { termos: ['violino', 'violin'], valor: 'Violino' },
  { termos: ['trombone'], valor: 'Trombone' },
  { termos: ['harmônica', 'harmonica'], valor: 'Harmônica' },
  { termos: ['cifra'], valor: 'Cifra' },
  { termos: ['letra', 'letras'], valor: 'Letra' },
  { termos: ['partitura', 'score'], valor: 'Partitura' },
  { termos: ['pandeiro', 'reco-reco', 'percussão'], valor: 'Percussão' },
]

/* --------------------------------------------------------------- estilos */
const ESTILOS: { termos: string[]; valor: string }[] = [
  { termos: ['bossa nova'], valor: 'Bossa Nova' },
  { termos: ['jazz'], valor: 'Jazz' },
  { termos: ['mpb'], valor: 'MPB' },
  { termos: ['choro'], valor: 'Choro' },
  { termos: ['samba'], valor: 'Samba' },
  { termos: ['forró', 'forro'], valor: 'Forró' },
  { termos: ['rock'], valor: 'Rock' },
  { termos: ['pop'], valor: 'Pop' },
  { termos: ['funk'], valor: 'Funk' },
  { termos: ['blues'], valor: 'Blues' },
  { termos: ['soul'], valor: 'Soul' },
  { termos: ['vals', 'valsa'], valor: 'Vals' },
  { termos: ['hino', 'marcha'], valor: 'Hino' },
  { termos: ['reggae'], valor: 'Reggae' },
  { termos: ['sertanejo'], valor: 'Sertanejo' },
  { termos: ['boate', 'baile'], valor: 'Boate' },
  { termos: ['cinema', 'filme'], valor: 'Cinema' },
]

/** "erroll garner" -> "Erroll Garner" (mantém partículas em minúscula). */
export function capitalizarNome(texto: string): string {
  const particulas = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'of', 'the'])
  return texto
    .split(/\s+/)
    .map((palavra, indice) => {
      if (!palavra) return palavra
      if (indice > 0 && particulas.has(palavra.toLowerCase())) return palavra.toLowerCase()
      if (/^[A-ZÀ-Ú]/.test(palavra)) return palavra
      return palavra.charAt(0).toLocaleUpperCase('pt-BR') + palavra.slice(1)
    })
    .join(' ')
}

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function limpar(texto: string): string {
  return texto
    .replace(/\s+/g, ' ')
    .replace(/^[|\-–—\s]+/, '')
    .replace(/[|\-–—\s]+$/, '')
    .trim()
}

function temInstrumento(texto: string): boolean {
  const normalizado = normalizar(texto)
  return INSTRUMENTOS.some((i) => i.termos.some((t) => normalizado.includes(t)))
}

/** Agrupa os itens de texto do PDF em linhas (mesma altura = mesma linha). */
export function agruparLinhas(
  itens: { texto: string; x: number; y: number; altura: number }[],
): LinhaPdf[] {
  const ordenados = [...itens].sort((a, b) => b.y - a.y || a.x - b.x)
  const linhas: LinhaPdf[] = []

  for (const item of ordenados) {
    if (!item.texto.trim()) continue
    const ultima = linhas[linhas.length - 1]
    if (ultima && Math.abs(ultima.y - item.y) <= Math.max(3, item.altura * 0.35)) {
      ultima.texto += item.texto
      ultima.altura = Math.max(ultima.altura, item.altura)
      ultima.x = Math.min(ultima.x, item.x)
    } else {
      linhas.push({
        texto: item.texto.trim(),
        y: item.y,
        altura: item.altura,
        x: item.x,
      })
    }
  }
  return linhas
}

/** Título: a linha de maior fonte, ignorando "decoração" (notas isoladas). */
export function detectarTitulo(linhas: LinhaPdf[]): string {
  const candidatas = linhas.filter((linha) => {
    const texto = linha.texto.trim()
    if (texto.length < 2 || texto.length > 60) return false
    if (!/[a-zà-ú0-9]{2}/i.test(texto)) return false
    return true
  })
  if (candidatas.length === 0) return ''

  const maiorFonte = Math.max(...candidatas.map((l) => l.altura))
  const grandes = candidatas.filter((l) => l.altura >= maiorFonte * 0.85)
  grandes.sort((a, b) => b.y - a.y || b.x - a.x)
  return limpar(grandes[0].texto)
}

/** Autor: parênteses, "por X", ou a linha logo abaixo do título. */
export function detectarAutor(linhas: LinhaPdf[], titulo: string): string {
  const indiceTitulo = linhas.findIndex((l) => limpar(l.texto) === titulo)

  for (const linha of linhas) {
    const entre = linha.texto.match(/\(([^)]{3,60})\)/)
    if (entre) return limpar(entre[1])
  }

  for (const linha of linhas) {
    const por = linha.texto.match(/\bpor\s+([A-ZÀ-Ú][\w.\s'’-]{2,40})/i)
    if (por) return limpar(por[1])
  }

  if (indiceTitulo >= 0) {
    for (let i = indiceTitulo + 1; i < Math.min(indiceTitulo + 4, linhas.length); i++) {
      const texto = linhas[i].texto.trim()
      if (texto.length < 3 || texto.length > 60) continue
      if (/^[a-g](mi|maj|7|dim|sus|add)?$/i.test(texto)) continue
      if (temInstrumento(texto)) continue
      if (/^\d+$/.test(texto)) continue
      if (/[|:\/\\]/.test(texto)) continue
      return limpar(texto)
    }
  }
  return ''
}

/**
 * Instrumento(s) citado(s) no texto da partitura.
 *
 * A partitura do app original traz o nome do instrumento escrito nela
 * ("Trumpete", "Teclado", "Baixo"). Se couber no campo (20 caracteres),
 * devolve todos em ordem; senão, o primeiro.
 */
export function detectarInstrumento(texto: string, nomeArquivo = ''): string {
  const normalizado = normalizar(`${nomeArquivo} ${texto}`)
  const encontrados: { valor: string; posicao: number }[] = []

  for (const item of INSTRUMENTOS) {
    for (const termo of item.termos) {
      const posicao = normalizado.indexOf(termo)
      if (posicao >= 0) {
        encontrados.push({ valor: item.valor, posicao })
        break
      }
    }
  }

  if (encontrados.length === 0) return ''
  encontrados.sort((a, b) => a.posicao - b.posicao)

  const unicos = [...new Set(encontrados.map((e) => e.valor))]
  const juntos = unicos.join(', ')
  return juntos.length <= 20 ? juntos : unicos[0]
}

export function detectarEstilo(texto: string): string {
  const normalizado = normalizar(texto)
  for (const item of ESTILOS) {
    if (item.termos.some((t) => normalizado.includes(t))) return item.valor
  }
  return ''
}

/** Título e instrumento a partir do nome do arquivo. */
export function doNomeDoArquivo(nomeArquivo: string): { titulo: string; instrumento: string } {
  const base = nomeArquivo.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim()
  const partes = base.split(/\s+-\s+|\s+–\s+/)
  const titulo = limpar(partes[0] ?? base)
  const instrumento = detectarInstrumento(partes.slice(1).join(' '), '')
  return { titulo, instrumento }
}

/** Junta tudo: linhas do PDF + nome do arquivo → sugestão de campos. */
export function analisarLinhas(
  linhas: LinhaPdf[],
  nomeArquivo: string,
  paginas: number,
): AnalisePartitura {
  const doArquivo = doNomeDoArquivo(nomeArquivo)
  const texto = linhas.map((l) => l.texto).join('\n')

  const titulo = capitalizarNome(detectarTitulo(linhas) || doArquivo.titulo)
  const autor = capitalizarNome(detectarAutor(linhas, titulo))
  const instrumento = detectarInstrumento(texto, nomeArquivo) || doArquivo.instrumento
  const estilo = detectarEstilo(texto)

  return { titulo, autor, instrumento, estilo, paginas }
}
