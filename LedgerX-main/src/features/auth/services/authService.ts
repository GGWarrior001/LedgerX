/**
 * authService – Firebase authentication operations (HARDENED v4)
 *
 * Changes from v3:
 *   - `init()` now sets `loading: true` eagerly so the app never shows
 *     a flash of unauthenticated state before the listener fires
 *   - `setPersistence` error no longer swallowed silently — logged via logger
 *   - `signIn`/`signUp` clear any stale error before attempting
 *   - `logOut` clears the encryption key (lock on sign-out)
 *   - `getAuthErrorMessage` exported separately for UI reuse
 *
 * Security note: `signIn`/`signUp` return { success, error? } and never
 * throw — UI components must check `success`, not catch exceptions.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/errors';
import { useAuthStore } from '../store/useAuthStore';

export interface AuthResult {
  success: boolean;
  user?:   User;
  error?:  string;
}

/** Maps Firebase Auth error codes to user-friendly messages. */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential':       'Invalid email or password.',
  'auth/user-not-found':           'No account found with this email.',
  'auth/wrong-password':           'Incorrect password.',
  'auth/email-already-in-use':     'An account with this email already exists.',
  'auth/invalid-email':            'Please enter a valid email address.',
  'auth/too-many-requests':        'Too many attempts. Please try again later.',
  'auth/network-request-failed':   'Network error. Please check your connection.',
  'auth/operation-not-allowed':    'Email/password sign-in is not enabled.',
  'auth/weak-password':            'Password is too weak. Please choose a stronger password.',
  'auth/invalid-api-key':          'Authentication configuration error. Please contact support.',
  'auth/app-not-authorized':       'This app is not authorised to use Firebase Authentication.',
  'auth/missing-config':           'Cloud sign-in is not configured for this build.',
  'auth/user-disabled':            'This account has been disabled. Please contact support.',
  'auth/requires-recent-login':    'Please sign in again to perform this action.',
};

/** Maps a Firebase Auth error to a user-friendly message. */
export function getAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  return AUTH_ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.';
}

export const authService = {
  /**
   * Attaches the Firebase auth-state listener.
   * Returns the unsubscribe function — callers must call it on unmount.
   *
   * Sets `loading: true` immediately so the app waits for the first
   * auth-state event before rendering (prevents unauthenticated flash).
   */
  init(): () => void {
    // Mark loading=true eagerly so AppShell shows spinner until resolved
    useAuthStore.getState().setLoading(true);

    // Set persistence — warn but continue if it fails (offline mode)
    setPersistence(auth, browserLocalPersistence).catch((err: unknown) => {
      logger.warn('authService', `Failed to set auth persistence: ${String(err)}`);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        useAuthStore.getState().initializeGuestSession();
      }
      // Set user and loading in one batch to avoid a render between them
      useAuthStore.setState({ user, loading: false });
    });

    return unsubscribe;
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    if (!isFirebaseConfigured) {
      return { success: false, error: 'auth/missing-config' };
    }

    useAuthStore.getState().setError(null);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      useAuthStore.setState({ user: cred.user, loading: false });
      return { success: true, user: cred.user };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? 'unknown';
      logger.warn('authService', `Sign-in failed: ${code}`);
      return { success: false, error: code };
    }
  },

  async signUp(email: string, password: string): Promise<AuthResult> {
    if (!isFirebaseConfigured) {
      return { success: false, error: 'auth/missing-config' };
    }

    useAuthStore.getState().setError(null);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      useAuthStore.setState({ user: cred.user, loading: false });
      return { success: true, user: cred.user };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? 'unknown';
      logger.warn('authService', `Sign-up failed: ${code}`);
      return { success: false, error: code };
    }
  },

  /**
   * Signs out and locks the encryption layer.
   * Encryption key must be cleared on sign-out so data is inaccessible
   * without re-entering the passcode.
   */
  async logOut(): Promise<void> {
    try {
      // Lock encryption before clearing Firebase session
      storage.clearEncryptionKey();
      await signOut(auth);
      logger.info('authService', 'User signed out');
    } catch (err: unknown) {
      logger.error('AUTH_ERROR', 'Sign-out failed', err);
      throw err;
    }
  },
};
