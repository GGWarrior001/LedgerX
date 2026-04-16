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
import { storage } from '@/lib/storage';
import type { Profile, Notification, AppSettings, ViewId, Invoice } from '@/lib/types';

const DEFAULT_PROFILE: Profile = {
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

export const useAppStore = create<AppStoreState>((set) => ({
  profile:       storage.load<Profile | null>('lx_profile', null),
  dark:          initialDark,
  privacyMode:   false,
  locked:        storage.isEncryptionSetup() && !storage.isUnlocked(),
  activeView:    'dashboard',
  settings:      storage.load<AppSettings>('lx_settings', DEFAULT_SETTINGS),
  notifications: storage.load<Notification[] | null>('lx_notifs', null) ?? [],

  setProfile: (profile) => {
    storage.save('lx_profile', profile);
    set({ profile });
  },

  saveSettings: (partial) => {
    set(s => {
      const profile = { ...(s.profile ?? DEFAULT_PROFILE), ...partial };
      storage.save('lx_profile', profile);
      return { profile };
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

  lock: () => set({ locked: true }),

  unlock: (passcode) => {
    const ok = storage.unlock(passcode);
    if (ok) set({ locked: false });
    return ok;
  },

  setupEncryption: (passcode) => {
    storage.setupEncryption(passcode);
    set(s => ({ settings: { ...s.settings, encryptionEnabled: true } }));
  },

  markNotifRead: (id) => {
    set(s => {
      const notifications = s.notifications.map(n => n.id === id ? { ...n, read: true } : n);
      storage.save('lx_notifs', notifications);
      return { notifications };
    });
  },

  markAllRead: () => {
    set(s => {
      const notifications = s.notifications.map(n => ({ ...n, read: true }));
      storage.save('lx_notifs', notifications);
      return { notifications };
    });
  },

  setNotifications: (notifications) => {
    storage.save('lx_notifs', notifications);
    set({ notifications });
  },

  rebuildNotifications: (invoices) => {
    const notifications = buildNotifications(invoices);
    storage.save('lx_notifs', notifications);
    set({ notifications });
  },
}));
