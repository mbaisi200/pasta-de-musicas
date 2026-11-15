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
 *
 * ⚠️ As instâncias ficam no `globalThis` de propósito: o bundler do Next pode
 * duplicar este módulo (um chunk para as páginas, outro para as rotas de API)
 * e, sem o cache global, o Firestore seria inicializado duas vezes — o que
 * quebra com "Firestore has already been initialized" na segunda vez.
 */

const GLOBAL = globalThis as typeof globalThis & {
  __firebaseAdminApp?: App
  __firebaseAdminDb?: Firestore
  __firebaseAdminAuth?: Auth
}

function pegarApp(): App {
  if (GLOBAL.__firebaseAdminApp) return GLOBAL.__firebaseAdminApp

  const existentes = getApps()
  if (existentes.length > 0) {
    GLOBAL.__firebaseAdminApp = existentes[0]
    return existentes[0]
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin não configurado. Defina FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no .env.local',
    )
  }

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
  GLOBAL.__firebaseAdminApp = app
  return app
}

export function getDb(): Firestore {
  if (GLOBAL.__firebaseAdminDb) return GLOBAL.__firebaseAdminDb

  const db = getFirestore(pegarApp())
  try {
    db.settings({ ignoreUndefinedProperties: true })
  } catch {
    // Já inicializado por outra instância do módulo — segue em frente.
  }
  GLOBAL.__firebaseAdminDb = db
  return db
}

/** Firebase Authentication (login/senha) — usado no servidor. */
export function getAuth(): Auth {
  if (GLOBAL.__firebaseAdminAuth) return GLOBAL.__firebaseAdminAuth
  GLOBAL.__firebaseAdminAuth = getAuthAdmin(pegarApp())
  return GLOBAL.__firebaseAdminAuth
}

/** Verdadeiro quando o Firebase está configurado no ambiente. */
export function firebaseConfigurado(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  )
}
