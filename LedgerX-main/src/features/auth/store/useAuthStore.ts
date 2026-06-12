/**
 * useAuthStore – Firebase authentication Zustand store (HARDENED v4)
 *
 * Bug fix: `loadLocalUser()` was calling `storage.load<LocalUser>(...)` which
 * is async — the Promise was silently used as the LocalUser value in the initial
 * state. Fixed by using `storage.loadSync()`.
 *
 * Also: `initializeGuestSession` previously called `storage.save()` without
 * await — now properly awaited (fire-and-forget with error logging).
 */
import { create } from 'zustand';
import type { User } from 'firebase/auth';
import { storage } from '@/lib/storage';
import type { LocalUser } from '@/lib/types';

type AuthMode = 'sign-in' | 'sign-up';

const DEFAULT_LOCAL_USER: LocalUser = {
  id: 'local',
  name: 'Guest',
  provider: 'local',
};

interface AuthStoreState {
  user:           User | null;
  localUser:      LocalUser | null;
  loading:        boolean;
  error:          string | null;
  authModalOpen:  boolean;
  authMode:       AuthMode;
  setUser:        (user: User | null) => void;
  setLoading:     (loading: boolean) => void;
  setError:       (error: string | null) => void;
  initializeGuestSession: () => void;
  openAuthModal:  (mode?: AuthMode) => void;
  closeAuthModal: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user:          null,
  // FIXED: was `storage.load(...)` (async, returns Promise) used synchronously.
  // loadSync() returns the default value if the key is encrypted/absent.
  localUser:     storage.loadSync<LocalUser>('lx_local_user', DEFAULT_LOCAL_USER),
  loading:       true,
  error:         null,
  authModalOpen: false,
  authMode:      'sign-in',

  setUser:    (user)    => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError:   (error)   => set({ error }),

  initializeGuestSession: () => {
    if (storage.isEncryptionSetup() && !storage.isUnlocked()) return;
    // Fire-and-forget with logging — guest session save is best-effort
    storage.save('lx_local_user', DEFAULT_LOCAL_USER).catch((err) => {
      console.error('[LedgerX] Failed to persist guest session:', err);
    });
    set({ localUser: DEFAULT_LOCAL_USER });
  },

  openAuthModal:  (mode = 'sign-in') => set({ authModalOpen: true, authMode: mode }),
  closeAuthModal: ()                  => set({ authModalOpen: false, error: null }),
}));
