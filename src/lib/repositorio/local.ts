import 'server-only'

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { CONFIG_PADRAO, type Configuracoes, type Musica } from '@/lib/types'
import { novoId } from '@/lib/utils'
import type { ArquivoLido, MusicaEntrada, Repositorio } from './tipos'

/**
 * Repositório local (desenvolvimento/demo).
 *
 * Guarda tudo em `.data/` na raiz do projeto: `musicas.json`,
 * `configuracoes.json` e `arquivos/`. Serve para rodar o app (e a PWA)
 * sem nenhum serviço externo — ideal para desenvolvimento e para testar
 * o deploy antes de configurar o Firebase.
 */

const RAIZ = join(process.cwd(), '.data')
const ARQ_MUSICAS = join(RAIZ, 'musicas.json')
const ARQ_CONFIG = join(RAIZ, 'configuracoes.json')
const DIR_ARQUIVOS = join(RAIZ, 'arquivos')

async function garantirDirs() {
  await mkdir(DIR_ARQUIVOS, { recursive: true })
}

async function lerJson<T>(caminho: string, padrao: T): Promise<T> {
  if (!existsSync(caminho)) return padrao
  try {
    const bruto = await readFile(caminho, 'utf-8')
    return JSON.parse(bruto) as T
  } catch {
    return padrao
  }
}

async function gravarJson(caminho: string, dados: unknown) {
  await garantirDirs()
  await writeFile(caminho, JSON.stringify(dados, null, 2), 'utf-8')
}

/** Escrita serializada para evitar corrida entre requisições simultâneas. */
let fila: Promise<unknown> = Promise.resolve()
function serializar<T>(tarefa: () => Promise<T>): Promise<T> {
  const resultado = fila.then(tarefa, tarefa)
  fila = resultado.catch(() => undefined)
  return resultado
}

export class RepositorioLocal implements Repositorio {
  readonly tipo = 'local' as const

  async listarMusicas(): Promise<Musica[]> {
    const musicas = await lerJson<Musica[]>(ARQ_MUSICAS, [])
    return musicas.sort(compararMusicas)
  }

  async obterMusica(id: string): Promise<Musica | null> {
    const musicas = await this.listarMusicas()
    return musicas.find((m) => m.id === id) ?? null
  }

  async criarMusica(dados: MusicaEntrada): Promise<Musica> {
    return serializar(async () => {
      const musicas = await lerJson<Musica[]>(ARQ_MUSICAS, [])
      const agora = new Date().toISOString()
      const musica: Musica = {
        id: novoId(),
        musica: dados.musica.trim(),
        autor: dados.autor.trim(),
        grupo: dados.grupo.trim(),
        estilo: dados.estilo.trim(),
        instrumento: dados.instrumento.trim(),
        arquivo: dados.arquivo ?? null,
        rolamento: dados.rolamento,
        velocidade: dados.velocidade,
        observacao: dados.observacao.trim(),
        ordem: dados.ordem,
        createdAt: agora,
        updatedAt: agora,
      }
      musicas.push(musica)
      await gravarJson(ARQ_MUSICAS, musicas)
      return musica
    })
  }

  async atualizarMusica(id: string, dados: Partial<MusicaEntrada>): Promise<Musica> {
    return serializar(async () => {
      const musicas = await lerJson<Musica[]>(ARQ_MUSICAS, [])
      const indice = musicas.findIndex((m) => m.id === id)
      if (indice === -1) throw new Error('Música não encontrada')
      const atual = musicas[indice]
      const anterior = atual.arquivo
      const musica: Musica = {
        ...atual,
        ...dados,
        id: atual.id,
        musica: (dados.musica ?? atual.musica).trim(),
        autor: (dados.autor ?? atual.autor).trim(),
        grupo: (dados.grupo ?? atual.grupo).trim(),
        estilo: (dados.estilo ?? atual.estilo).trim(),
        instrumento: (dados.instrumento ?? atual.instrumento).trim(),
        observacao: (dados.observacao ?? atual.observacao).trim(),
        createdAt: atual.createdAt,
        updatedAt: new Date().toISOString(),
      }
      musicas[indice] = musica
      await gravarJson(ARQ_MUSICAS, musicas)

      // Se o arquivo foi trocado, remove o antigo do disco.
      if (anterior && dados.arquivo && anterior.nome !== dados.arquivo.nome) {
        await apagarArquivoDisco(id, anterior.nome)
      }
      return musica
    })
  }

  async excluirMusica(id: string): Promise<void> {
    await serializar(async () => {
      const musicas = await lerJson<Musica[]>(ARQ_MUSICAS, [])
      const alvo = musicas.find((m) => m.id === id)
      if (!alvo) throw new Error('Música não encontrada')
      if (alvo.arquivo) await this.removerArquivo(id).catch(() => undefined)
      await gravarJson(
        ARQ_MUSICAS,
        musicas.filter((m) => m.id !== id),
      )
    })
  }

  async lerConfiguracoes(): Promise<Configuracoes> {
    return { ...CONFIG_PADRAO, ...(await lerJson<Partial<Configuracoes>>(ARQ_CONFIG, {})) }
  }

  async salvarConfiguracoes(config: Partial<Configuracoes>): Promise<Configuracoes> {
    return serializar(async () => {
      const atual = await this.lerConfiguracoes()
      const novo = { ...atual, ...config }
      await gravarJson(ARQ_CONFIG, novo)
      return novo
    })
  }

  async salvarArquivo(
    id: string,
    arquivo: { buffer: Buffer; nome: string; tipo: string },
  ) {
    await garantirDirs()
    const caminho = join('arquivos', id, arquivo.nome)
    const destino = join(RAIZ, caminho)
    await mkdir(join(RAIZ, 'arquivos', id), { recursive: true })
    await writeFile(destino, arquivo.buffer)
    return {
      nome: arquivo.nome,
      caminho,
      tamanho: arquivo.buffer.length,
      tipo: arquivo.tipo || 'application/pdf',
    }
  }

  async lerArquivo(id: string): Promise<ArquivoLido | null> {
    const musica = await this.obterMusica(id)
    const nome = musica?.arquivo?.nome
    if (!nome) return null
    const destino = join(RAIZ, 'arquivos', id, nome)
    if (!existsSync(destino)) return null
    const buffer = await readFile(destino)
    return {
      buffer,
      tipo: musica?.arquivo?.tipo || 'application/pdf',
      nome,
    }
  }

  async removerArquivo(id: string): Promise<void> {
    const pasta = join(RAIZ, 'arquivos', id)
    if (existsSync(pasta)) await rm(pasta, { recursive: true, force: true })
  }
}

/** Apaga um arquivo específico do disco (usado quando o PDF é substituído). */
async function apagarArquivoDisco(id: string, nome: string): Promise<void> {
  const destino = join(RAIZ, 'arquivos', id, nome)
  if (existsSync(destino)) await rm(destino, { force: true })
}

function compararMusicas(a: Musica, b: Musica): number {
  const grupo = a.grupo.localeCompare(b.grupo, 'pt-BR')
  if (grupo !== 0) return grupo
  if (a.ordem !== b.ordem) return a.ordem - b.ordem
  return a.musica.localeCompare(b.musica, 'pt-BR')
}

/** Lista os arquivos de dados criados (útil para depuração). */
export async function listarArquivosLocais(): Promise<string[]> {
  if (!existsSync(DIR_ARQUIVOS)) return []
  return readdir(DIR_ARQUIVOS)
}
