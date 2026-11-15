import 'server-only'

import { FieldValue, Timestamp } from 'firebase-admin/firestore'

import { getDb } from '@/lib/firebase/admin'
import { CONFIG_PADRAO, type Configuracoes, type Musica } from '@/lib/types'
import { novoId } from '@/lib/utils'
import type { ArquivoLido, MusicaEntrada, Repositorio } from './tipos'

const COLECAO = 'musicas'
const SUBPARTITURA = 'partitura'
const DOC_PARTITURA = 'atual'
const DOC_CONFIG = 'app'

/**
 * Repositório de produção: Firestore.
 *
 * Metadados em `musicas/{id}`; o PDF da partitura fica em
 * `musicas/{id}/partitura/atual` (base64), em um documento separado — assim o
 * catálogo não baixa as partituras a cada visita (o `listar()` só lê a
 * coleção principal).
 *
 * Motivo de não usar o Cloud Storage: desde 03/02/2026 ele exige o plano pago
 * (Blaze, com cartão de crédito). O Firestore funciona no plano gratuito e
 * comporta até ~700 KB de PDF por documento.
 */
export class RepositorioFirebase implements Repositorio {
  readonly tipo = 'firebase' as const

  private get colecao() {
    return getDb().collection(COLECAO)
  }

  async listarMusicas(): Promise<Musica[]> {
    const snap = await this.colecao.get()
    const musicas = snap.docs.map((doc) => converterMusica(doc.id, doc.data()))
    return musicas.sort((a, b) => {
      const grupo = a.grupo.localeCompare(b.grupo, 'pt-BR')
      if (grupo !== 0) return grupo
      if (a.ordem !== b.ordem) return a.ordem - b.ordem
      return a.musica.localeCompare(b.musica, 'pt-BR')
    })
  }

  async obterMusica(id: string): Promise<Musica | null> {
    const doc = await this.colecao.doc(id).get()
    if (!doc.exists) return null
    return converterMusica(doc.id, doc.data() ?? {})
  }

  async criarMusica(dados: MusicaEntrada): Promise<Musica> {
    const id = novoId()
    const agora = new Date().toISOString()
    const musica: Musica = {
      id,
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
    await this.colecao.doc(id).set(toDoc(musica))
    return musica
  }

  async atualizarMusica(id: string, dados: Partial<MusicaEntrada>): Promise<Musica> {
    const ref = this.colecao.doc(id)
    const snap = await ref.get()
    if (!snap.exists) throw new Error('Música não encontrada')
    const atual = converterMusica(id, snap.data() ?? {})
    const arquivo = dados.arquivo !== undefined ? dados.arquivo : atual.arquivo
    const musica: Musica = {
      ...atual,
      ...dados,
      id,
      arquivo,
      createdAt: atual.createdAt,
      updatedAt: new Date().toISOString(),
    }
    await ref.set(toDoc(musica), { merge: true })
    return musica
  }

  async excluirMusica(id: string): Promise<void> {
    // A subcoleção não é apagada junto com o documento pai.
    await this.colecao.doc(id).collection(SUBPARTITURA).doc(DOC_PARTITURA).delete()
    await this.colecao.doc(id).delete()
  }

  async lerConfiguracoes(): Promise<Configuracoes> {
    const snap = await getDb().collection('configuracoes').doc(DOC_CONFIG).get()
    if (!snap.exists) return { ...CONFIG_PADRAO }
    return { ...CONFIG_PADRAO, ...(snap.data() ?? {}) }
  }

  async salvarConfiguracoes(config: Partial<Configuracoes>): Promise<Configuracoes> {
    const ref = getDb().collection('configuracoes').doc(DOC_CONFIG)
    const atual = await this.lerConfiguracoes()
    const novo = { ...atual, ...config, atualizadoEm: new Date().toISOString() }
    await ref.set(novo, { merge: true })
    return novo
  }

  async salvarArquivo(id: string, arquivo: { buffer: Buffer; nome: string; tipo: string }) {
    const dados = arquivo.buffer.toString('base64')
    const caminho = `${COLECAO}/${id}/${SUBPARTITURA}/${DOC_PARTITURA}`
    await this.colecao
      .doc(id)
      .collection(SUBPARTITURA)
      .doc(DOC_PARTITURA)
      .set({
        nome: arquivo.nome,
        tamanho: arquivo.buffer.length,
        tipo: arquivo.tipo || 'application/pdf',
        dados,
      })
    return {
      nome: arquivo.nome,
      caminho,
      tamanho: arquivo.buffer.length,
      tipo: arquivo.tipo || 'application/pdf',
    }
  }

  async lerArquivo(id: string): Promise<ArquivoLido | null> {
    const snap = await this.colecao
      .doc(id)
      .collection(SUBPARTITURA)
      .doc(DOC_PARTITURA)
      .get()
    if (!snap.exists) return null
    const dados = snap.data()
    if (!dados?.dados) return null
    return {
      buffer: Buffer.from(String(dados.dados), 'base64'),
      tipo: String(dados.tipo ?? 'application/pdf'),
      nome: String(dados.nome ?? 'partitura.pdf'),
    }
  }

  async removerArquivo(id: string): Promise<void> {
    await this.colecao
      .doc(id)
      .collection(SUBPARTITURA)
      .doc(DOC_PARTITURA)
      .delete()
  }
}

function toDoc(musica: Musica) {
  return {
    musica: musica.musica,
    autor: musica.autor,
    grupo: musica.grupo,
    estilo: musica.estilo,
    instrumento: musica.instrumento,
    arquivo: musica.arquivo ?? null,
    rolamento: musica.rolamento,
    velocidade: musica.velocidade,
    observacao: musica.observacao,
    ordem: musica.ordem,
    createdAt: musica.createdAt,
    updatedAt: musica.updatedAt,
    atualizadoEm: FieldValue.serverTimestamp(),
  }
}

function converterMusica(id: string, dados: Record<string, unknown>): Musica {
  const arquivo = dados.arquivo as Musica['arquivo'] | null | undefined
  return {
    id,
    musica: String(dados.musica ?? ''),
    autor: String(dados.autor ?? ''),
    grupo: String(dados.grupo ?? ''),
    estilo: String(dados.estilo ?? ''),
    instrumento: String(dados.instrumento ?? ''),
    arquivo: arquivo ?? null,
    rolamento: Boolean(dados.rolamento),
    velocidade: Number(dados.velocidade ?? 0),
    observacao: String(dados.observacao ?? ''),
    ordem: Number(dados.ordem ?? 0),
    createdAt: paraIso(dados.createdAt),
    updatedAt: paraIso(dados.updatedAt),
  }
}

function paraIso(valor: unknown): string {
  if (typeof valor === 'string') return valor
  if (valor instanceof Timestamp) return valor.toDate().toISOString()
  return new Date().toISOString()
}
