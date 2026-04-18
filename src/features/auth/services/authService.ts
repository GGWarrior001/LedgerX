/**
 * authService – Firebase authentication operations.
 *
 * Wraps Firebase Auth so that the rest of the app never imports Firebase
 * directly; swap the backend here without touching any component.
 *
 * `init()` sets up the `onAuthStateChanged` listener that keeps the
 * Zustand store in sync; call it once from AppShell.
 *
 * `signIn` and `signUp` return `{ success, user?, error? }` and also
 * eagerly call `setUser` so the store is updated immediately without
 * waiting for the async `onAuthStateChanged` event.
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
import { auth } from '@/lib/firebase';
import { useAuthStore } from '../store/useAuthStore';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/** Maps Firebase Auth error codes to user-friendly messages. */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential':      'Invalid email or password.',
  'auth/user-not-found':          'No account found with this email.',
  'auth/wrong-password':          'Incorrect password.',
  'auth/email-already-in-use':    'An account with this email already exists.',
  'auth/invalid-email':           'Please enter a valid email address.',
  'auth/too-many-requests':       'Too many attempts. Please try again later.',
  'auth/network-request-failed':  'Network error. Please check your connection.',
  'auth/operation-not-allowed':   'Email/password sign-in is not enabled. Please contact support.',
  'auth/weak-password':           'Password is too weak. Please choose a stronger password.',
  'auth/invalid-api-key':         'Authentication configuration error. Please contact support.',
  'auth/app-not-authorized':      'This app is not authorized to use Firebase Authentication.',
};

/** Maps a Firebase Auth error to a user-friendly message. */
export function getAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  return AUTH_ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.';
}

export const authService = {
  /** Attach the Firebase auth-state listener. Returns the unsubscribe fn. */
  init(): () => void {
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.warn('[LedgerX] Failed to set auth persistence:', err);
    });

    return onAuthStateChanged(auth, (user) => {
      useAuthStore.getState().setUser(user);
      useAuthStore.getState().setLoading(false);
    });
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    console.log('[LedgerX] signIn – before Firebase call');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      console.log('[LedgerX] signIn – Firebase response received, uid:', cred.user.uid);
      console.log('[LedgerX] signIn – before setUser');
      useAuthStore.getState().setUser(cred.user);
      useAuthStore.getState().setLoading(false);
      console.log('[LedgerX] signIn – after setUser');
      return { success: true, user: cred.user };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? 'unknown';
      console.error('[LedgerX] signIn – error', code, err);
      return { success: false, error: code };
    }
  },

  async signUp(email: string, password: string): Promise<AuthResult> {
    console.log('[LedgerX] signUp – before Firebase call');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      console.log('[LedgerX] signUp – Firebase response received, uid:', cred.user.uid);
      console.log('[LedgerX] signUp – before setUser');
      useAuthStore.getState().setUser(cred.user);
      useAuthStore.getState().setLoading(false);
      console.log('[LedgerX] signUp – after setUser');
      return { success: true, user: cred.user };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? 'unknown';
      console.error('[LedgerX] signUp – error', code, err);
      return { success: false, error: code };
    }
  },

  async logOut(): Promise<void> {
    await signOut(auth);
  },
};
