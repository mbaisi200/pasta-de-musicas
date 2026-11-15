/**
 * Tipos de domínio — espelham a tabela `músicas.DBF` do app original em
 * Visual FoxPro, com acréscimos necessários ao ambiente web/nuvem.
 *
 * Origem (VFP):  MÚSICA | AUTOR | GRUPO | ESTILO | INSTRUMENT | PDF |
 *                ROLAMENTO | VELOCIDADE | OBSERVAÇÕE | ORDEM
 */

export type Equipamento = 'micro' | 'tablet' | 'celular'

export interface ArquivoMusica {
  /** Nome original do arquivo enviado pelo usuário. */
  nome: string
  /** Identificador do arquivo (caminho em disco no modo local, subdocumento no Firestore). */
  caminho: string
  /** Tamanho em bytes. */
  tamanho: number
  /** MIME type (application/pdf). */
  tipo: string
  /** Número de páginas (preenchido após o upload). */
  paginas?: number
}

/**
 * Tamanho máximo do PDF, em bytes.
 *
 * O Firestore aceita 1 MiB por documento e o base64 cresce ~33%, então
 * 700 KB de PDF viram ~955 KB de base64 — dentro do limite, com folga.
 */
export const TAMANHO_MAXIMO_PDF = 700 * 1024

export interface Musica {
  id: string
  /** Nome da música (campo MÚSICA). */
  musica: string
  /** Autor(es) (campo AUTOR). */
  autor: string
  /** SetList / Repertório (campo GRUPO) — agrupa as músicas. */
  grupo: string
  /** Estilo (campo ESTILO). */
  estilo: string
  /** Instrumento / tipo de partitura (campo INSTRUMENT). */
  instrumento: string
  /** Arquivo de partitura no Storage (substitui o caminho local do PDF). */
  arquivo: ArquivoMusica | null
  /** Rolagem automática do PDF (campo ROLAMENTO). */
  rolamento: boolean
  /** Velocidade da rolagem, 0..9 (campo VELOCIDADE). */
  velocidade: number
  /** Observações (campo OBSERVAÇÕE). */
  observacao: string
  /** Ordem dentro do SetList (campo ORDEM). */
  ordem: number
  createdAt: string
  updatedAt: string
}

export interface Configuracoes {
  /** Texto de ajuda exibido na tela Ajuda. */
  ajuda: string
  /** Mensagem fixa (ex.: contato do fornecedor). */
  mensagem: string
  /** Nome do responsável pelo app. */
  nome: string
  /** E-mail de contato. */
  email: string
  /** Versão exibida. */
  versao: string
  /** Instrumento padrão sugerido no cadastro (campo INSTRUMENTO_PADR). */
  instrumentoPadrao: string
  /** Equipamento padrão do usuário (campo INSTRUMENTO do form de ajuda). */
  equipamento: Equipamento
}

export const CONFIG_PADRAO: Configuracoes = {
  ajuda:
    'Pasta de Músicas — organize suas partituras em qualquer dispositivo.\n\n' +
    '1. Na tela inicial, use a busca e os filtros (SetList, Estilo, Autor, Instrumento) para achar a música.\n' +
    '2. Toque no nome da música para abrir a partitura.\n' +
    '3. Use "Rolar" para a rolagem automática da partitura e ajuste a velocidade de 1 a 9.\n' +
    '4. Em Manutenção você cadastra, altera e exclui músicas e envia o PDF.',
  mensagem: '',
  nome: 'Ivan Sampaio',
  email: 'sampaioivan@gmail.com',
  versao: '1.0',
  instrumentoPadrao: 'Teclado',
  equipamento: 'celular',
}

/** Faixa de velocidade da rolagem automática (mesma do app VFP: 0..9). */
export const VELOCIDADE_MIN = 0
export const VELOCIDADE_MAX = 9

/** Critérios de ordenação disponíveis na tela de catálogo. */
export type OrdemCatalogo =
  | 'setlist'
  | 'musica'
  | 'autor'
  | 'estilo'
  | 'instrumento'

export const ORDEM_CATALOGO: { valor: OrdemCatalogo; rotulo: string }[] = [
  { valor: 'setlist', rotulo: 'SetList' },
  { valor: 'musica', rotulo: 'Nome da música' },
  { valor: 'autor', rotulo: 'Autor' },
  { valor: 'estilo', rotulo: 'Estilo' },
  { valor: 'instrumento', rotulo: 'Instrumento' },
]

/** Filtros combináveis da tela de catálogo. */
export interface Filtros {
  busca: string
  grupo: string
  estilo: string
  autor: string
  instrumento: string
}

export const FILTROS_VAZIOS: Filtros = {
  busca: '',
  grupo: '',
  estilo: '',
  autor: '',
  instrumento: '',
}
