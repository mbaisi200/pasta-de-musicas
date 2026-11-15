import type { ArquivoMusica, Configuracoes, Musica } from '@/lib/types'

/** Dados de entrada para criar/atualizar uma música (sem id/ timestamps). */
export interface MusicaEntrada {
  musica: string
  autor: string
  grupo: string
  estilo: string
  instrumento: string
  observacao: string
  ordem: number
  rolamento: boolean
  velocidade: number
  arquivo?: ArquivoMusica | null
}

export interface ArquivoLido {
  buffer: Buffer
  tipo: string
  nome: string
}

/**
 * Contrato de acesso aos dados. Duas implementações:
 *  - `firebase` (produção): Firestore, com o PDF embutido no documento
 *  - `local`    (dev/demo): arquivos JSON em `.data/`, PDF em disco
 *
 * Os PDFs ficam **dentro do documento** da música (base64) em vez do Cloud
 * Storage: desde 03/02/2026 o Storage exige o plano Blaze (cartão de
 * crédito), e o Firestore no plano gratuito (Spark) não exige nada.
 *
 * Limite: documento do Firestore = 1 MiB. Como base64 inflates ~33%,
 * o PDF fica limitado a ~700 KB (ver `TAMANHO_MAXIMO_PDF`).
 */
export interface Repositorio {
  readonly tipo: 'firebase' | 'local'

  listarMusicas(): Promise<Musica[]>
  obterMusica(id: string): Promise<Musica | null>
  criarMusica(dados: MusicaEntrada): Promise<Musica>
  atualizarMusica(id: string, dados: Partial<MusicaEntrada>): Promise<Musica>
  excluirMusica(id: string): Promise<void>

  lerConfiguracoes(): Promise<Configuracoes>
  salvarConfiguracoes(config: Partial<Configuracoes>): Promise<Configuracoes>

  /** Grava o PDF da música e devolve os metadados do arquivo. */
  salvarArquivo(
    id: string,
    arquivo: { buffer: Buffer; nome: string; tipo: string },
  ): Promise<ArquivoMusica>
  /** Lê o PDF atual da música (null se não houver). */
  lerArquivo(id: string): Promise<ArquivoLido | null>
  /** Remove o PDF da música. */
  removerArquivo(id: string): Promise<void>
}
