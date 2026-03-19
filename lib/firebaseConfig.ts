/**
 * Inicialización de Firebase Admin SDK para Onda.
 * Usa variables de entorno: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.
 *
 * Para Vector Search (findNearest, FieldValue.vector) se usa @google-cloud/firestore
 * con las mismas credenciales; ver getFirestoreForVector().
 */

import * as admin from "firebase-admin";
import { Firestore } from "@google-cloud/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

function getPrivateKey(): string {
  if (!privateKeyRaw) return "";
  return privateKeyRaw.replace(/\\n/g, "\n");
}

let firebaseApp: admin.app.App | null = null;
let firestoreVector: Firestore | null = null;

/**
 * Inicializa Firebase Admin una sola vez y devuelve la app.
 * Si faltan variables de entorno, devuelve null.
 */
export function getFirebaseApp(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;
  if (!projectId || !clientEmail || !privateKeyRaw) return null;
  const privateKey = getPrivateKey();
  if (!privateKey) return null;
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    return firebaseApp;
  } catch (e) {
    console.error("[firebaseConfig] init error:", e);
    return null;
  }
}

/**
 * Devuelve Firestore de Firebase Admin (para uso general).
 */
export function getFirestore(): admin.firestore.Firestore | null {
  const app = getFirebaseApp();
  return app ? app.firestore() : null;
}

/**
 * Devuelve una instancia de Firestore de @google-cloud/firestore con las mismas
 * credenciales, para usar findNearest y FieldValue.vector (Vector Search).
 */
export function getFirestoreForVector(): Firestore | null {
  if (firestoreVector) return firestoreVector;
  if (!projectId || !clientEmail || !privateKeyRaw) return null;
  const privateKey = getPrivateKey();
  if (!privateKey) return null;
  try {
    firestoreVector = new Firestore({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
    return firestoreVector;
  } catch (e) {
    console.error("[firebaseConfig] Firestore vector init error:", e);
    return null;
  }
}

export function isFirebaseConfigured(): boolean {
  return !!(projectId && clientEmail && privateKeyRaw);
}
