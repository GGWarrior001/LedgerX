/**
 * Auth store — manages Firebase authentication state.
 *
 * Replaces the old AuthContext. Exposes reactive `user` and `loading` state
 * plus `signIn`, `signUp`, and `logOut` actions.
 */
import { create } from 'zustand';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { auth } from '@/shared/api/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
}

interface AuthActions {
  /** Call once on app mount to start listening for auth changes */
  init: () => () => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  user: null,
  loading: true,

  init: () => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      set({ user: firebaseUser, loading: false });
    });
    return unsubscribe;
  },

  signUp: async (email, password) => {
    await createUserWithEmailAndPassword(auth, email, password);
  },

  signIn: async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  },

  logOut: async () => {
    await signOut(auth);
  },
}));
