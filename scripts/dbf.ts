/**
 * Leitor de DBF (Visual FoxPro / dBase III) sem dependências externas.
 *
 * Suporta os tipos usados pelo app original: C (caractere), N (numérico),
 * L (lógico), D (data) e M (memo, via arquivo .FPT).
 *
 * Memo no VFP: o campo guarda um ponteiro de 4 bytes (little-endian) que
 * indica o BLOCO do arquivo .FPT. O bloco começa em `ponteiro * unidade`
 * (unidade lida no cabeçalho do .FPT, normalmente 64 bytes); o bloco tem um
 * cabeçalho de 8 bytes (4 = próximo bloco, 4 = tamanho do dado em big-endian)
 * seguido do texto.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

export interface CampoDbf {
  nome: string
  tipo: string
  tamanho: number
  decimais: number
}

export interface RegistroDbf {
  [campo: string]: string
}

export function lerDbf(caminho: string): { campos: CampoDbf[]; registros: RegistroDbf[] } {
  const buffer = readFileSync(caminho)

  const totalRegistros = buffer.readUInt32LE(4)
  const tamanhoCabecalho = buffer.readUInt16LE(8)
  const tamanhoRegistro = buffer.readUInt16LE(10)

  const campos: CampoDbf[] = []
  let offset = 32
  while (buffer[offset] !== 0x0d) {
    campos.push({
      nome: buffer.toString('latin1', offset, offset + 11).replace(/\0.*$/, '').trim(),
      tipo: String.fromCharCode(buffer[offset + 11]),
      tamanho: buffer[offset + 16],
      decimais: buffer[offset + 17],
    })
    offset += 32
  }

  const temMemo = campos.some((c) => c.tipo === 'M')
  const caminhoFpt = localizarFpt(caminho)
  const fpt = temMemo && caminhoFpt ? readFileSync(caminhoFpt) : null

  const registros: RegistroDbf[] = []
  for (let i = 0; i < totalRegistros; i++) {
    const inicio = tamanhoCabecalho + i * tamanhoRegistro
    const bruto = buffer.subarray(inicio, inicio + tamanhoRegistro)
    if (bruto.length === 0) break
    if (bruto[0] === 0x2a) continue // registro apagado

    const registro: RegistroDbf = {}
    let pos = 1
    for (const campo of campos) {
      if (campo.tipo === 'M') {
        const ponteiro = bruto.readUInt32LE(pos)
        registro[campo.nome] = lerMemo(fpt, ponteiro)
        pos += campo.tamanho
        continue
      }
      const valor = bruto.toString('latin1', pos, pos + campo.tamanho)
      pos += campo.tamanho
      registro[campo.nome] = converter(valor, campo)
    }
    registros.push(registro)
  }

  return { campos, registros }
}

/**
 * Localiza o arquivo .FPT correspondente ao .DBF.
 * O Windows não diferencia maiúsculas de minúsculas; o Linux sim — por isso
 * procuramos o arquivo ignorando as maiúsculas no diretório.
 */
function localizarFpt(caminhoDbf: string): string | null {
  const direto = caminhoDbf.replace(/\.dbf$/i, '.fpt')
  if (existsSync(direto)) return direto

  const dir = dirname(caminhoDbf)
  const base = basename(caminhoDbf).replace(/\.dbf$/i, '')
  if (!existsSync(dir)) return null

  const candidato = readdirSync(dir).find(
    (arquivo) => /\.fpt$/i.test(arquivo) && arquivo.replace(/\.fpt$/i, '') === base,
  )
  return candidato ? join(dir, candidato) : null
}

function converter(bruto: string, campo: CampoDbf): string {
  const valor = bruto.trim()
  switch (campo.tipo) {
    case 'L':
      return valor.toUpperCase() === 'T' ? 'T' : 'F'
    case 'N':
      return valor === '' ? '' : String(Number(valor))
    case 'D':
      if (valor.length !== 8) return ''
      return `${valor.slice(6, 8)}/${valor.slice(4, 6)}/${valor.slice(0, 4)}`
    default:
      return valor
  }
}

/** Lê o texto de um memo a partir do ponteiro gravado no DBF. */
export function lerMemo(fpt: Buffer | null, ponteiro: number): string {
  if (!fpt || !ponteiro) return ''
  const unidade = fpt.length >= 8 ? fpt.readUInt32BE(4) || 64 : 64
  const inicio = ponteiro * unidade
  if (inicio + 8 > fpt.length) return ''
  const tamanho = fpt.readUInt32BE(inicio + 4)
  if (inicio + 8 + tamanho > fpt.length) return ''
  return fpt.toString('latin1', inicio + 8, inicio + 8 + tamanho).replace(/\0+$/, '')
}
