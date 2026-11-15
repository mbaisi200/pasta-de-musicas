import { z } from 'zod'

/**
 * Booleanos que aceitam `true`/`false` (JSON) e também `"true"`/`"false"`.
 * `z.coerce.boolean()` não serve: a string `"false"` viraria `true`.
 */
export const zBoolean = z.preprocess((valor) => {
  if (typeof valor === 'boolean') return valor
  if (typeof valor === 'string') return valor.trim().toLowerCase() === 'true'
  if (typeof valor === 'number') return valor !== 0
  return false
}, z.boolean())
