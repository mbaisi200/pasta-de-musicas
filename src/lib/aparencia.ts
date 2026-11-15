import type { SVGProps } from 'react'

import {
  Audio,
  Bateria,
  Baixo,
  Cifra,
  Flauta,
  Letra,
  Microfone,
  Pentagrama,
  Sax,
  Seminima,
  Songbook,
  Teclado,
  Trumpete,
  Violao,
  type IconeMusical,
} from '@/components/icones/musicais'

/**
 * Iconografia musical do app.
 *
 * Cada tipo de partitura ganha um ícone desenhado para este projeto
 * (teclado de piano, trompete, clave de fá, diagrama de cifra…) e uma cor
 * de acento. O app original guardava isso como texto livre ("Partituras -
 * Teclado", "Letra & Cifra"), e é essa informação que vira ícone na grade.
 */

export interface AparenciaInstrumento {
  icone: IconeMusical
  /** Classes de cor (tokens do tema — funcionam em claro e escuro). */
  cor: string
  corFundo: string
}

const REGRAS: { termos: string[]; aparencia: AparenciaInstrumento }[] = [
  {
    termos: ['teclado', 'piano', 'key', 'pian', 'sint', 'organ'],
    aparencia: { icone: Teclado, cor: 'text-amber-300', corFundo: 'bg-amber-500/15' },
  },
  {
    termos: ['trumpet', 'trumpete', 'trompete', 'metais', 'brass', 'trombone', 'flugel'],
    aparencia: { icone: Trumpete, cor: 'text-orange-300', corFundo: 'bg-orange-500/15' },
  },
  {
    termos: ['contrabaixo', 'baixo', 'bass'],
    aparencia: { icone: Baixo, cor: 'text-rose-300', corFundo: 'bg-rose-500/15' },
  },
  {
    termos: ['guitar', 'violao', 'violão', 'cavaquinho'],
    aparencia: { icone: Violao, cor: 'text-lime-300', corFundo: 'bg-lime-500/15' },
  },
  {
    termos: ['bateria', 'drum', 'percus', 'caixa'],
    aparencia: { icone: Bateria, cor: 'text-red-300', corFundo: 'bg-red-500/15' },
  },
  {
    termos: ['sax'],
    aparencia: { icone: Sax, cor: 'text-yellow-200', corFundo: 'bg-yellow-500/15' },
  },
  {
    termos: ['flauta', 'violino', 'cello', 'violoncelo', 'corda', 'oboe', 'clarinete'],
    aparencia: { icone: Flauta, cor: 'text-violet-300', corFundo: 'bg-violet-500/15' },
  },
  {
    termos: ['voz', 'vocal', 'microfone', 'micro', 'cantor', 'coro'],
    aparencia: { icone: Microfone, cor: 'text-emerald-300', corFundo: 'bg-emerald-500/15' },
  },
  {
    termos: ['cifra', 'cifras'],
    aparencia: { icone: Cifra, cor: 'text-teal-300', corFundo: 'bg-teal-500/15' },
  },
  {
    termos: ['letra', 'letras', 'texto'],
    aparencia: { icone: Letra, cor: 'text-sky-300', corFundo: 'bg-sky-500/15' },
  },
  {
    termos: ['real book', 'songbook'],
    aparencia: { icone: Songbook, cor: 'text-stone-200', corFundo: 'bg-stone-500/20' },
  },
  {
    termos: ['partitura', 'score'],
    aparencia: { icone: Pentagrama, cor: 'text-fuchsia-300', corFundo: 'bg-fuchsia-500/15' },
  },
  {
    termos: ['audio', 'gravacao', 'gravação', 'mp3'],
    aparencia: { icone: Audio, cor: 'text-cyan-300', corFundo: 'bg-cyan-500/15' },
  },
]

const PADRAO: AparenciaInstrumento = {
  icone: Seminima,
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
 * Derivada do nome → o mesmo repertório sempre tem a mesma cor.
 */
export function corDoGrupo(grupo: string): { cor: string; fundo: string } {
  const PALETA = [
    { cor: 'text-amber-300', fundo: 'bg-amber-500/15' },
    { cor: 'text-rose-300', fundo: 'bg-rose-500/15' },
    { cor: 'text-teal-300', fundo: 'bg-teal-500/15' },
    { cor: 'text-violet-300', fundo: 'bg-violet-500/15' },
    { cor: 'text-lime-300', fundo: 'bg-lime-500/15' },
    { cor: 'text-sky-300', fundo: 'bg-sky-500/15' },
    { cor: 'text-orange-300', fundo: 'bg-orange-500/15' },
    { cor: 'text-emerald-300', fundo: 'bg-emerald-500/15' },
  ]
  if (!grupo) return { cor: 'text-muted-foreground', fundo: 'bg-muted' }

  let hash = 0
  for (let i = 0; i < grupo.length; i++) {
    hash = (hash * 31 + grupo.charCodeAt(i)) % 100000
  }
  return PALETA[hash % PALETA.length]
}

/** Tipo aceito por qualquer lugar que renderize um ícone musical. */
export type Icone = (props: SVGProps<SVGSVGElement>) => React.ReactElement
