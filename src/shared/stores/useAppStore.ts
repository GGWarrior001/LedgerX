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
  activeView:    ViewId;
  settings:      AppSettings;
  notifications: Notification[];

  // Actions
  setProfile:           (profile: Profile) => void;
  saveSettings:         (partial: Partial<Profile>) => void;
  ensureProfile:        () => void;
  setActiveView:        (view: ViewId) => void;
  toggleTheme:          () => void;
  togglePrivacy:        () => void;
  lock:                 () => void;
  unlock:               (passcode: string) => boolean;
  setupEncryption:      (passcode: string) => void;
  markNotifRead:        (id: number) => void;
  markAllRead:          () => void;
  setNotifications:     (notifs: Notification[]) => void;
  rebuildNotifications: (invoices: Invoice[]) => void;
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
  activeView:    'dashboard',
  settings:      loadStored<AppSettings>('lx_settings', DEFAULT_SETTINGS),
  notifications: loadStored<Notification[] | null>('lx_notifs', null) ?? [],

  setProfile: (profile) => {
    if (!canPersistEncryptedData()) return;
    storage.save('lx_profile', profile);
    set({ profile });
  },

  saveSettings: (partial) => {
    if (!canPersistEncryptedData()) return;
    set(s => {
      const profile = { ...(s.profile ?? DEFAULT_PROFILE), ...partial };
      storage.save('lx_profile', profile);
      return { profile };
    });
  },

  ensureProfile: () => {
    if (!canPersistEncryptedData()) return;
    set(s => {
      if (s.profile) return s;
      storage.save('lx_profile', DEFAULT_PROFILE);
      return { profile: DEFAULT_PROFILE };
    });
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

  unlock: (passcode) => {
    const ok = storage.unlock(passcode);
    if (ok) set({ locked: false });
    return ok;
  },

  setupEncryption: (passcode) => {
    storage.setupEncryption(passcode);
    set(s => {
      const settings = { ...s.settings, encryptionEnabled: true };
      storage.save('lx_settings', settings);
      return { settings };
    });
  },

  markNotifRead: (id) => {
    if (!canPersistEncryptedData()) return;
    set(s => {
      const notifications = s.notifications.map(n => n.id === id ? { ...n, read: true } : n);
      storage.save('lx_notifs', notifications);
      return { notifications };
    });
  },

  markAllRead: () => {
    if (!canPersistEncryptedData()) return;
    set(s => {
      const notifications = s.notifications.map(n => ({ ...n, read: true }));
      storage.save('lx_notifs', notifications);
      return { notifications };
    });
  },

  setNotifications: (notifications) => {
    if (!canPersistEncryptedData()) return;
    storage.save('lx_notifs', notifications);
    set({ notifications });
  },

  rebuildNotifications: (invoices) => {
    if (!canPersistEncryptedData()) return;
    const notifications = buildNotifications(invoices);
    storage.save('lx_notifs', notifications);
    set({ notifications });
  },
}));
