import {
  AudioLines,
  Disc3,
  Drum,
  Guitar,
  Headphones,
  KeyboardMusic,
  MicVocal,
  Music2,
  Music4,
  Piano,
  type LucideIcon,
} from 'lucide-react'

/**
 * Ícone e cor de cada tipo de partitura.
 *
 * O app original guardava o instrumento como texto livre ("Partituras -
 * Teclado", "Letra & Cifra", "Trumpete"…). Aqui transformamos isso em
 * ícone + cor, o que deixa a grade muito mais rápida de ler — especialmente
 * no celular, onde o espaço é escasso.
 */

export interface AparenciaInstrumento {
  icone: LucideIcon
  /** Classes de cor (tokens do tema — funcionam em claro e escuro). */
  cor: string
  corFundo: string
}

const REGRAS: { termos: string[]; aparencia: AparenciaInstrumento }[] = [
  {
    termos: ['teclado', 'piano', 'key', 'pian', 'sint'],
    aparencia: {
      icone: Piano,
      cor: 'text-sky-300 dark:text-sky-300',
      corFundo: 'bg-sky-500/15',
    },
  },
  {
    termos: ['baixo', 'bass'],
    aparencia: {
      icone: Disc3,
      cor: 'text-violet-300 dark:text-violet-300',
      corFundo: 'bg-violet-500/15',
    },
  },
  {
    termos: ['trumpet', 'trumpete', 'trompete', 'metais', 'brass', 'sax', 'trombone'],
    aparencia: {
      icone: Music4,
      cor: 'text-amber-300 dark:text-amber-300',
      corFundo: 'bg-amber-500/15',
    },
  },
  {
    termos: ['guitar', 'violao', 'violão', 'cavaquinho'],
    aparencia: {
      icone: Guitar,
      cor: 'text-orange-300 dark:text-orange-300',
      corFundo: 'bg-orange-500/15',
    },
  },
  {
    termos: ['bateria', 'drum', 'percus'],
    aparencia: {
      icone: Drum,
      cor: 'text-rose-300 dark:text-rose-300',
      corFundo: 'bg-rose-500/15',
    },
  },
  {
    termos: ['voz', 'vocal', 'microfone', 'micro', 'cantor'],
    aparencia: {
      icone: MicVocal,
      cor: 'text-emerald-300 dark:text-emerald-300',
      corFundo: 'bg-emerald-500/15',
    },
  },
  {
    termos: ['cifra', 'cifras'],
    aparencia: {
      icone: Music2,
      cor: 'text-lime-300 dark:text-lime-300',
      corFundo: 'bg-lime-500/15',
    },
  },
  {
    termos: ['letra', 'letras', 'texto'],
    aparencia: {
      icone: AudioLines,
      cor: 'text-teal-300 dark:text-teal-300',
      corFundo: 'bg-teal-500/15',
    },
  },
  {
    termos: ['flauta', 'violino', 'cello', 'violoncelo', 'corda', 'metais'],
    aparencia: {
      icone: Headphones,
      cor: 'text-cyan-300 dark:text-cyan-300',
      corFundo: 'bg-cyan-500/15',
    },
  },
]

const PADRAO: AparenciaInstrumento = {
  icone: KeyboardMusic,
  cor: 'text-primary',
  corFundo: 'bg-primary/15',
}

/** Descobre ícone e cor a partir do texto do instrumento. */
export function aparenciaDoInstrumento(instrumento: string): AparenciaInstrumento {
  const texto = (instrumento ?? '').toLowerCase()
  if (!texto) return PADRAO
  for (const regra of REGRAS) {
    if (regra.termos.some((termo) => texto.includes(termo))) return regra.aparencia
  }
  return PADRAO
}

/**
 * Cor de acento para um SetList.
 *
 * Deriva uma cor estável a partir do nome do grupo, para que o mesmo
 * SetList sempre apareça com a mesma cor (vira "familia" visual no repertório).
 */
export function corDoGrupo(grupo: string): { cor: string; fundo: string } {
  const PALETA = [
    { cor: 'text-sky-300', fundo: 'bg-sky-500/15' },
    { cor: 'text-emerald-300', fundo: 'bg-emerald-500/15' },
    { cor: 'text-amber-300', fundo: 'bg-amber-500/15' },
    { cor: 'text-violet-300', fundo: 'bg-violet-500/15' },
    { cor: 'text-rose-300', fundo: 'bg-rose-500/15' },
    { cor: 'text-teal-300', fundo: 'bg-teal-500/15' },
    { cor: 'text-orange-300', fundo: 'bg-orange-500/15' },
    { cor: 'text-indigo-300', fundo: 'bg-indigo-500/15' },
  ]
  if (!grupo) return { cor: 'text-muted-foreground', fundo: 'bg-muted' }

  let hash = 0
  for (let i = 0; i < grupo.length; i++) {
    hash = (hash * 31 + grupo.charCodeAt(i)) % 100000
  }
  return PALETA[hash % PALETA.length]
}
