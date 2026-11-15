'use client'

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

/**
 * Firebase Web SDK — usado **apenas para o Authentication** (login/senha).
 *
 * Os dados do app (músicas, partituras) nunca passam por aqui: o navegador
 * fala com a API do servidor, que acessa o Firestore pelo Admin SDK.
 * O Web SDK só cuide da identidade do usuário.
 *
 * As chaves abaixo são públicas por natureza (a API key do Firebase não é
 * segredo); o que protege os dados são as regras `deny all` do Firestore.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app: FirebaseApp | null = null
let auth: Auth | null = null

export function firebaseConfigurado(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId)
}

export function getAuthClient(): Auth {
  if (!firebaseConfigurado()) {
    throw new Error(
      'Firebase Web SDK não configurado. Defina NEXT_PUBLIC_FIREBASE_API_KEY, ' +
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID e NEXT_PUBLIC_FIREBASE_APP_ID no .env.local',
    )
  }
  if (!auth) {
    app = getApps().length > 0 ? getApp() : initializeApp(config)
    auth = getAuth(app)
  }
  return auth
}
