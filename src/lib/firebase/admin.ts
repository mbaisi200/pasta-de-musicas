import 'server-only'

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth as getAuthAdmin, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

/**
 * Inicialização do Firebase Admin SDK (servidor).
 *
 * Todo o acesso a dados passa por aqui — o browser nunca fala direto com o
 * Firestore, e as regras do Firebase podem ficar restritivas.
 *
 * Não usamos o Cloud Storage: desde 03/02/2026 ele exige o plano pago (Blaze).
 * Os PDFs das partituras ficam dentro do Firestore (base64), em subdocumento.
 */

function pegarApp(): App {
  if (getApps().length > 0) return getApps()[0]

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin não configurado. Defina FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no .env.local',
    )
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

let db: Firestore | null = null
let auth: Auth | null = null

export function getDb(): Firestore {
  if (!db) {
    db = getFirestore(pegarApp())
    db.settings({ ignoreUndefinedProperties: true })
  }
  return db
}

/** Firebase Authentication (login/senha) — usado no servidor. */
export function getAuth(): Auth {
  if (!auth) auth = getAuthAdmin(pegarApp())
  return auth
}

/** Verdadeiro quando o Firebase está configurado no ambiente. */
export function firebaseConfigurado(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  )
}
