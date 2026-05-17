/**
 * useAuthStore – Firebase authentication Zustand store.
 *
 * Holds both the current Firebase User and the local guest session so
 * the app can boot directly into offline-first mode.
 */
import { create } from 'zustand';
import type { User } from 'firebase/auth';
import { StorageLockedError, storage } from '@/lib/storage';
import type { LocalUser } from '@/lib/types';

type AuthMode = 'sign-in' | 'sign-up';

const DEFAULT_LOCAL_USER: LocalUser = {
  id: 'local',
  name: 'Guest',
  provider: 'local',
};

interface AuthStoreState {
  user:       User | null;
  localUser:  LocalUser | null;
  loading:    boolean;
  error:      string | null;
  authModalOpen: boolean;
  authMode:   AuthMode;
  setUser:    (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError:   (error: string | null) => void;
  initializeGuestSession: () => void;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
}

function loadLocalUser(): LocalUser {
  try {
    return storage.load<LocalUser>('lx_local_user', DEFAULT_LOCAL_USER);
  } catch (err) {
    if (err instanceof StorageLockedError) return DEFAULT_LOCAL_USER;
    throw err;
  }
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user:       null,
  localUser:  loadLocalUser(),
  loading:    true,
  error:      null,
  authModalOpen: false,
  authMode:   'sign-in',
  setUser:    (user)    => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError:   (error)   => set({ error }),
  initializeGuestSession: () => {
    if (storage.isEncryptionSetup() && !storage.isUnlocked()) return;
    storage.save('lx_local_user', DEFAULT_LOCAL_USER);
    set({ localUser: DEFAULT_LOCAL_USER });
  },
  openAuthModal: (mode = 'sign-in') => set({ authModalOpen: true, authMode: mode }),
  closeAuthModal: () => set({ authModalOpen: false, error: null }),
}));
