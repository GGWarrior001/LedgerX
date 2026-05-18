/**
 * useAppStore – shared UI & profile Zustand store.
 *
 * Manages:
 *   - User profile & business settings
 *   - Active view / navigation state
 *   - Dark mode & privacy mode
 *   - App-lock state and encryption
 *   - In-app notifications (derived from invoice statuses)
 */
import { create } from 'zustand';
import { StorageLockedError, storage } from '@/lib/storage';
import type { Profile, Notification, AppSettings, ViewId, Invoice } from '@/lib/types';

export const DEFAULT_PROFILE: Profile = {
  name: '',
  role: 'Admin',
  city: '',
  businessName: 'LedgerX',
  fiscalYear: 'Apr-Mar',
  currency: '₹',
  dataChoice: 'demo',
};

const DEFAULT_SETTINGS: AppSettings = {
  sessionTimeout: 10,
  privacyMode: false,
  encryptionEnabled: false,
};

/** Derives overdue / pending notifications from the current invoice list. */
function buildNotifications(invoices: Invoice[]): Notification[] {
  const notifs: Notification[] = [];
  invoices.filter(i => i.status === 'overdue').forEach(i => {
    const days = Math.round((Date.now() - new Date(i.dueDate).getTime()) / 86400000);
    notifs.push({
      id: i.id,
      title: `Invoice ${i.number} Overdue`,
      sub: `${i.clientName} · ${days} day${days !== 1 ? 's' : ''} overdue`,
      read: false,
      type: 'danger',
    });
  });
  invoices.filter(i => i.status === 'sent').forEach(i => {
    // Offset by 1000 to avoid collision with overdue IDs (inherited from v1 schema).
    // Safe as long as total invoices stay well below 1000; invoice IDs are sequential.
    notifs.push({
      id: i.id + 1000,
      title: 'Payment Pending',
      sub: `${i.clientName} · ${i.number}`,
      read: false,
      type: 'warning',
    });
  });
  return notifs;
}

interface AppStoreState {
  profile:       Profile | null;
  dark:          boolean;
  privacyMode:   boolean;
  locked:        boolean;
  unlocking:     boolean;
  activeView:    ViewId;
  settings:      AppSettings;
  notifications: Notification[];

  // Actions
  setProfile:           (profile: Profile) => Promise<void>;
  saveSettings:         (partial: Partial<Profile>) => Promise<void>;
  ensureProfile:        () => Promise<void>;
  setActiveView:        (view: ViewId) => void;
  toggleTheme:          () => void;
  togglePrivacy:        () => void;
  lock:                 () => void;
  unlock:               (passcode: string) => Promise<void>;
  setupEncryption:      (passcode: string) => Promise<void>;
  markNotifRead:        (id: number) => Promise<void>;
  markAllRead:          () => Promise<void>;
  setNotifications:     (notifs: Notification[]) => Promise<void>;
  rebuildNotifications: (invoices: Invoice[]) => Promise<void>;
}

const initialDark = localStorage.getItem('lx_dark') === '1';
if (initialDark) document.documentElement.classList.add('dark');

function loadStored<T>(key: string, defaultValue: T): T {
  try {
    return storage.load<T>(key, defaultValue);
  } catch (err) {
    if (err instanceof StorageLockedError) return defaultValue;
    throw err;
  }
}

function canPersistEncryptedData(): boolean {
  return !storage.isEncryptionSetup() || storage.isUnlocked();
}

export const useAppStore = create<AppStoreState>((set) => ({
  profile:       loadStored<Profile | null>('lx_profile', null),
  dark:          initialDark,
  privacyMode:   false,
  locked:        storage.isEncryptionSetup() && !storage.isUnlocked(),
  unlocking:     false,
  activeView:    'dashboard',
  settings:      loadStored<AppSettings>('lx_settings', DEFAULT_SETTINGS),
  notifications: loadStored<Notification[] | null>('lx_notifs', null) ?? [],

  setProfile: async (profile) => {
    if (!canPersistEncryptedData()) return Promise.resolve();
    try {
      await storage.save('lx_profile', profile);
      set({ profile });
    } catch (err) {
      console.error('[LedgerX] Failed to save profile:', err);
      throw err;
    }
  },

  saveSettings: async (partial) => {
    if (!canPersistEncryptedData()) return Promise.resolve();
    try {
      // Compute new profile state using current store state
      const currentState = useAppStore.getState();
      const profile = { ...(currentState.profile ?? DEFAULT_PROFILE), ...partial };
      
      // Persist to storage before updating state
      await storage.save('lx_profile', profile);
      
      // Only update state after persistence succeeds
      set({ profile });
    } catch (err) {
      console.error('[LedgerX] Failed to save settings:', err);
      throw err;
    }
  },

  ensureProfile: async () => {
    if (!canPersistEncryptedData()) return Promise.resolve();
    try {
      const currentState = useAppStore.getState();
      if (currentState.profile) return Promise.resolve();
      
      // Profile missing; create and persist default
      await storage.save('lx_profile', DEFAULT_PROFILE);
      set({ profile: DEFAULT_PROFILE });
    } catch (err) {
      console.error('[LedgerX] Failed to ensure profile:', err);
      throw err;
    }
  },

  setActiveView: (activeView) => set({ activeView }),

  toggleTheme: () => {
    set(s => {
      const dark = !s.dark;
      document.documentElement.classList.toggle('dark', dark);
      localStorage.setItem('lx_dark', dark ? '1' : '0');
      return { dark };
    });
  },

  togglePrivacy: () => set(s => ({ privacyMode: !s.privacyMode })),

  lock: () => { storage.clearEncryptionKey(); set({ locked: true }); },

  unlock: async (passcode) => {
    const get = useAppStore.getState;
    if (get().unlocking) {
      console.warn('[LedgerX] Unlock already in progress, ignoring duplicate attempt');
      return Promise.resolve();
    }

    set({ unlocking: true });
    try {
      const ok = await storage.unlock(passcode);
      if (ok) {
        set({ locked: false, unlocking: false });
      } else {
        set({ unlocking: false });
        throw new Error('Incorrect passcode');
      }
    } catch (err) {
      set({ unlocking: false });
      console.error('[LedgerX] Unlock failed:', err);
      throw err;
    }
  },

  setupEncryption: async (passcode) => {
    set({ unlocking: true });
    try {
      await storage.setupEncryption(passcode);
      const settings = { ...useAppStore.getState().settings, encryptionEnabled: true };
      await storage.save('lx_settings', settings);
      set({ settings, unlocking: false });
    } catch (err) {
      set({ unlocking: false });
      console.error('[LedgerX] Encryption setup failed:', err);
      throw err;
    }
  },

  markNotifRead: async (id) => {
    if (!canPersistEncryptedData()) return Promise.resolve();
    try {
      const currentState = useAppStore.getState();
      const notifications = currentState.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      );
      
      await storage.save('lx_notifs', notifications);
      set({ notifications });
    } catch (err) {
      console.error('[LedgerX] Failed to mark notification read:', err);
      throw err;
    }
  },

  markAllRead: async () => {
    if (!canPersistEncryptedData()) return Promise.resolve();
    try {
      const currentState = useAppStore.getState();
      const notifications = currentState.notifications.map(n => ({ ...n, read: true }));
      
      await storage.save('lx_notifs', notifications);
      set({ notifications });
    } catch (err) {
      console.error('[LedgerX] Failed to mark all notifications read:', err);
      throw err;
    }
  },

  setNotifications: async (notifications) => {
    if (!canPersistEncryptedData()) return Promise.resolve();
    try {
      await storage.save('lx_notifs', notifications);
      set({ notifications });
    } catch (err) {
      console.error('[LedgerX] Failed to save notifications:', err);
      throw err;
    }
  },

  rebuildNotifications: async (invoices) => {
    if (!canPersistEncryptedData()) return Promise.resolve();
    try {
      const notifications = buildNotifications(invoices);
      
      await storage.save('lx_notifs', notifications);
      set({ notifications });
    } catch (err) {
      console.error('[LedgerX] Failed to rebuild notifications:', err);
      throw err;
    }
  },
}));
