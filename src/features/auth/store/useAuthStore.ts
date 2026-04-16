/**
 * useAuthStore – Firebase authentication Zustand store.
 *
 * Holds the current Firebase User and loading state.
 * Authentication side-effects (listener setup, sign-in/out) are
 * handled by `authService` and called from AppShell.
 */
import { create } from 'zustand';
import type { User } from 'firebase/auth';

interface AuthStoreState {
  user:       User | null;
  loading:    boolean;
  setUser:    (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user:       null,
  loading:    true,
  setUser:    (user)    => set({ user }),
  setLoading: (loading) => set({ loading }),
}));
