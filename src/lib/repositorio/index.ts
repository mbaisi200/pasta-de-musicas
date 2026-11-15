import 'server-only'

import { firebaseConfigurado } from '@/lib/firebase/admin'
import { RepositorioFirebase } from './firebase'
import { RepositorioLocal } from './local'
import type { Repositorio } from './tipos'

export type { MusicaEntrada, Repositorio } from './tipos'

let instancia: Repositorio | null = null

/**
 * Escolhe o repositório conforme o ambiente:
 *  - Firebase configurado  -> Firestore + Storage (produção)
 *  - sem credenciais       -> arquivos locais em `.data/` (dev/demo)
 *
 * Dá para forçar o modo local com `REPOSITORY=local` (útil em preview).
 */
export function getRepositorio(): Repositorio {
  if (instancia) return instancia
  const forcar = process.env.REPOSITORY?.toLowerCase()
  const usarFirebase = forcar === 'firebase' || (forcar !== 'local' && firebaseConfigurado())
  instancia = usarFirebase ? new RepositorioFirebase() : new RepositorioLocal()
  return instancia
}

export function repositorioLocal(): RepositorioLocal {
  return new RepositorioLocal()
}
