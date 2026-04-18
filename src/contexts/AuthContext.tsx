/**
 * AuthContext – backward-compatible facade over the Zustand auth store.
 *
 * `AuthProvider` is now a no-op: Firebase auth state lives in `useAuthStore`
 * and the listener is attached by AppShell.
 * `useAuth()` reads from `useAuthStore` and delegates to `authService`.
 */
import React from 'react';
import type { User } from 'firebase/auth';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { authService }  from '@/features/auth/services/authService';

interface AuthContextType {
  user:    User | null;
  loading: boolean;
  signUp:  (email: string, password: string) => Promise<void>;
  signIn:  (email: string, password: string) => Promise<void>;
  logOut:  () => Promise<void>;
}

/** No-op provider – auth state lives in useAuthStore. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/** Drop-in replacement for the old `useAuth()` hook. */
export function useAuth(): AuthContextType {
  const { user, loading } = useAuthStore();
  return {
    user,
    loading,
    signIn:  authService.signIn.bind(authService),
    signUp:  authService.signUp.bind(authService),
    logOut:  authService.logOut.bind(authService),
  };
}
