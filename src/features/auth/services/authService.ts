/**
 * authService – Firebase authentication operations.
 *
 * Wraps Firebase Auth so that the rest of the app never imports Firebase
 * directly; swap the backend here without touching any component.
 *
 * `init()` sets up the `onAuthStateChanged` listener that keeps the
 * Zustand store in sync; call it once from AppShell.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '../store/useAuthStore';

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

  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  },

  async signUp(email: string, password: string): Promise<void> {
    await createUserWithEmailAndPassword(auth, email, password);
  },

  async logOut(): Promise<void> {
    await signOut(auth);
  },
};
