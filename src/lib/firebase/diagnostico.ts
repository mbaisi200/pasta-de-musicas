import 'server-only'

/**
 * Diagnóstico da configuração do Firebase no servidor.
 *
 * Serve para descobrir **qual** variável de ambiente está com problema —
 * sem nunca expor o valor de um segredo. Cada item volta com:
 *   - `ok`: verdadeiro/falso
 *   - `detalhe`: o que foi encontrado (tamanho, formato, prefixo mascarado)
 *
 * É o que responde "por que o deploy na Vercel dá erro?".
 */

export interface ItemDiagnostico {
  variavel: string
  ok: boolean
  detalhe: string
  /** O que fazer quando está errado. */
  correcao?: string
}

export interface Diagnostico {
  ok: boolean
  itens: ItemDiagnostico[]
  /** Erro do Firestore, se a conexão falhou. */
  erroFirestore?: string
  ambiente: string
}

function mascarar(valor: string, inicio = 6, fim = 4): string {
  if (!valor) return '(vazio)'
  if (valor.length <= inicio + fim) return '*'.repeat(valor.length)
  return `${valor.slice(0, inicio)}…${valor.slice(-fim)}`
}

export async function diagnosticar(): Promise<Diagnostico> {
  const itens: ItemDiagnostico[] = []

  /* ------------------------------------------------------- project id */
  const projectId = process.env.FIREBASE_PROJECT_ID ?? ''
  itens.push({
    variavel: 'FIREBASE_PROJECT_ID',
    ok: Boolean(projectId),
    detalhe: projectId ? `"${projectId}"` : 'não definida',
    correcao: 'Firebase Console → Configurações do projeto → o ID do projeto.',
  })

  /* ------------------------------------------------------ client email */
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? ''
  const emailValido = /^[\w.+-]+@[\w-]+\.iam\.gserviceaccount\.com$/.test(clientEmail)
  itens.push({
    variavel: 'FIREBASE_CLIENT_EMAIL',
    ok: emailValido,
    detalhe: clientEmail
      ? `${mascarar(clientEmail, 22, 30)}${emailValido ? '' : ' — formato inesperado'}`
      : 'não definida',
    correcao:
      'Deve terminar em "@<projeto>.iam.gserviceaccount.com" (copie do JSON da conta de serviço).',
  })

  /* ----------------------------------------------------- private key */
  const bruta = process.env.FIREBASE_PRIVATE_KEY ?? ''
  const temCabecalho = bruta.includes('BEGIN PRIVATE KEY')
  const temRodape = bruta.includes('END PRIVATE KEY')
  const temEscapes = bruta.includes('\\n')
  const temQuebrasReais = bruta.includes('\n')
  const tamanho = bruta.length

  let detalheChave = 'não definida'
  let okChave = false
  let correcaoChave =
    'Cole a chave inteira em UMA linha: "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"'

  if (bruta) {
    const partes: string[] = []
    partes.push(`${tamanho} caracteres`)

    // 1) aspas sobrando — o erro mais comum ao colar na Vercel
    const temAspas = bruta.trim().startsWith('"') || bruta.trim().endsWith('"')
    if (temAspas) {
      partes.push('⚠️ começa/termina com aspas')
      correcaoChave = 'Remova as aspas do início e do fim do valor na Vercel.'
    }

    // 2) cabeçalho e rodapé
    partes.push(temCabecalho ? 'com BEGIN ✓' : 'SEM "BEGIN PRIVATE KEY" ✗')
    partes.push(temRodape ? 'com END ✓' : 'SEM "END PRIVATE KEY" ✗')

    // 3) formato das quebras de linha (os dois funcionam, mas é bom saber)
    if (temEscapes && !temQuebrasReais) partes.push('\\n literais ✓')
    else if (temQuebrasReais) partes.push('quebras de linha reais ✓')
    else partes.push('SEM quebra nenhuma — valor truncado?')

    // 4) teste real: a chave consegue assinar?
    let assinou = false
    try {
      const { createSign } = await import('node:crypto')
      const { normalizarChave } = await import('./chave')
      createSign('RSA-SHA256').update('teste').sign(normalizarChave(bruta) ?? '')
      assinou = true
      partes.push('assina ✓')
    } catch (erro) {
      partes.push(`NÃO assina ✗ (${erro instanceof Error ? erro.message.slice(0, 60) : 'erro'})`)
      correcaoChave =
        'A chave está corrompida. Copie de novo do .env.local ou do JSON da conta de serviço.'
    }

    detalheChave = partes.join(' · ')
    okChave = temCabecalho && temRodape && tamanho > 1500 && assinou && !temAspas
  }

  itens.push({
    variavel: 'FIREBASE_PRIVATE_KEY',
    ok: okChave,
    detalhe: detalheChave,
    correcao: correcaoChave,
  })

  /* ------------------------------------------------------ conexão real */
  let erroFirestore: string | undefined
  if (itens.every((i) => i.ok)) {
    try {
      const { getDb } = await import('@/lib/firebase/admin')
      await getDb().collection('musicas').limit(1).get()
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro)
      erroFirestore = mensagem
      if (/DECODER routines|bad decrypt|PEM/i.test(mensagem)) {
        itens[2] = {
          ...itens[2],
          ok: false,
          detalhe: `${itens[2].detalhe} — o Firebase não conseguiu decodificar a chave`,
          correcao:
            'A chave foi colada incorretamente (aspas ou \\n). Copie o valor exato do .env.local.',
        }
      }
      if (/PERMISSION_DENIED|403/i.test(mensagem)) {
        itens[1] = {
          ...itens[1],
          ok: false,
          detalhe: `${itens[1].detalhe} — sem permissão no projeto`,
          correcao:
            'A conta de serviço precisa do papel "Firebase Admin" (Google Cloud → IAM).',
        }
      }
      if (/NOT_FOUND|project/i.test(mensagem)) {
        itens[0] = {
          ...itens[0],
          ok: false,
          detalhe: `${itens[0].detalhe} — projeto não encontrado`,
          correcao: 'Confira o ID do projeto (sem espaços, tudo minúsculo).',
        }
      }
    }
  }

  return {
    ok: itens.every((i) => i.ok) && !erroFirestore,
    itens,
    erroFirestore,
    ambiente: process.env.VERCEL ? 'Vercel' : process.env.NODE_ENV ?? 'desconhecido',
  }
}
