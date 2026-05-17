import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseConfig = {
  apiKey: firebaseEnv.apiKey ?? 'placeholder-api-key',
  authDomain: firebaseEnv.authDomain ?? 'ledgerx.localhost',
  projectId: firebaseEnv.projectId ?? 'ledgerx-local',
  storageBucket: firebaseEnv.storageBucket ?? 'ledgerx-local.appspot.com',
  messagingSenderId: firebaseEnv.messagingSenderId ?? '000000000000',
  appId: firebaseEnv.appId ?? '1:000000000000:web:0000000000000000000000',
};

export const isFirebaseConfigured = Object.values(firebaseEnv).every(
  (value) => typeof value === 'string' && value.trim().length > 0,
);

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

if (!isFirebaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[LedgerX] Firebase is not configured. ' +
    'Set the VITE_FIREBASE_* environment variables to enable authentication and cloud sync.'
  );
}

export const auth = getAuth(app);
export const db = getFirestore(app);
