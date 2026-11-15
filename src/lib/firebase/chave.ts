/**
 * Normaliza a chave privada da Service Account.
 *
 * Aceita as variações que aparecem quando a chave é colada em painéis
 * (Vercel, GitHub, Docker…):
 *
 *   "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
 *    ^ com aspas      ^ \n como texto (2 caracteres) ou quebra real
 *
 * Devolve sempre o PEM válido, com quebras de linha reais — ou `undefined`
 * quando a variável não existe.
 */
export function normalizarChave(valor: string | undefined): string | undefined {
  if (!valor) return undefined

  return valor
    .trim()
    // aspas simples/duplas sobrando (o erro mais comum ao colar)
    .replace(/^["'`]+/, '')
    .replace(/["'`]+$/, '')
    // \n literais (2 caracteres) → quebra de linha real
    .replace(/\\n/g, '\n')
    // Windows: normaliza CRLF
    .replace(/\r\n/g, '\n')
    .trim()
}
