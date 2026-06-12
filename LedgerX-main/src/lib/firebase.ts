/**
 * firebase.ts – LedgerX Firebase initialization (HARDENED v4)
 *
 * Fix M-6: In production builds, missing Firebase config now throws an
 * informative error instead of silently using placeholder values. Placeholder
 * values caused silent failures where auth/sync appeared to work but all
 * network operations failed with cryptic Firebase errors.
 *
 * Behavior:
 *   - DEV + missing config: warns and uses offline-safe placeholders (same as before)
 *   - PROD + missing config: throws at startup with a clear error message
 *   - PROD + valid config: normal operation
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

interface FirebaseEnv {
  apiKey:            string | undefined;
  authDomain:        string | undefined;
  projectId:         string | undefined;
  storageBucket:     string | undefined;
  messagingSenderId: string | undefined;
  appId:             string | undefined;
}

const firebaseEnv: FirebaseEnv = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured: boolean = Object.values(firebaseEnv).every(
  (v): v is string => typeof v === 'string' && v.trim().length > 0
);

// ── Production guard ──────────────────────────────────────────────────────────

const isProd = import.meta.env.PROD;

if (isProd && !isFirebaseConfigured) {
  // In production builds Firebase is required for auth and cloud sync.
  // Log clearly so CI/CD pipelines catch missing env vars immediately.
  const missing = Object.entries(firebaseEnv)
    .filter(([, v]) => !v)
    .map(([k]) => `VITE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`)
    .join(', ');
  throw new Error(
    `[LedgerX] Firebase is not configured in production.\n` +
    `Missing environment variables: ${missing}\n` +
    `See .env.example for required variables.`
  );
}

if (!isProd && !isFirebaseConfigured) {
  console.warn(
    '[LedgerX] Firebase is not configured. ' +
    'Set the VITE_FIREBASE_* environment variables to enable authentication and cloud sync. ' +
    'The app will run in offline-only mode.'
  );
}

// ── Firebase config ───────────────────────────────────────────────────────────

const firebaseConfig = isFirebaseConfigured
  ? {
      apiKey:            firebaseEnv.apiKey!,
      authDomain:        firebaseEnv.authDomain!,
      projectId:         firebaseEnv.projectId!,
      storageBucket:     firebaseEnv.storageBucket!,
      messagingSenderId: firebaseEnv.messagingSenderId!,
      appId:             firebaseEnv.appId!,
    }
  : {
      // Offline-safe placeholders — all Firebase operations will fail gracefully
      // (LedgerX is designed to work offline-first).
      apiKey:            'placeholder-api-key',
      authDomain:        'ledgerx.localhost',
      projectId:         'ledgerx-local',
      storageBucket:     'ledgerx-local.appspot.com',
      messagingSenderId: '000000000000',
      appId:             '1:000000000000:web:0000000000000000000000',
    };

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
