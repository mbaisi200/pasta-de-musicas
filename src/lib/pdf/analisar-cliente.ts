'use client'

/**
 * "Carregar PDF e analisar" — no navegador.
 *
 * O app já carrega o pdf.js (é o motor do player), então reaproveitamos o
 * mesmo motor para ler o texto da partitura e sugerir nome, autor,
 * instrumento e estilo. Não é preciso subir o arquivo para o servidor só
 * para isso.
 */

import { analisarLinhas, agruparLinhas, type AnalisePartitura } from './regras'

export async function analisarPartituraNoNavegador(
  arquivo: File,
): Promise<AnalisePartitura> {
  const vazio: AnalisePartitura = {
    titulo: '',
    autor: '',
    instrumento: '',
    estilo: '',
    paginas: 0,
  }

  try {
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf/pdf.worker.min.mjs'

    const dados = new Uint8Array(await arquivo.arrayBuffer())
    const documento = await pdfjs.getDocument({
      data: dados,
      useSystemFonts: false,
      disableFontFace: true,
    }).promise

    const itens: { texto: string; x: number; y: number; altura: number }[] = []
    const paginasParaLer = Math.min(documento.numPages, 2)

    for (let n = 1; n <= paginasParaLer; n++) {
      const pagina = await documento.getPage(n)
      const conteudo = await pagina.getTextContent()
      for (const item of conteudo.items) {
        if (!('str' in item)) continue
        itens.push({
          texto: item.str,
          x: item.transform[4] ?? 0,
          y: item.transform[5] ?? 0,
          altura: item.height ?? 0,
        })
      }
    }

    const linhas = agruparLinhas(itens)
    const analise = analisarLinhas(linhas, arquivo.name, documento.numPages)
    return analise
  } catch (erro) {
    console.error('[analisar-cliente] falhou:', erro)
    return vazio
  }
}
