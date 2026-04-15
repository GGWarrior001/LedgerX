/**
 * App-level UI store — dark mode, privacy, lock, notifications, and settings.
 *
 * This replaces the UI-related parts of the old monolithic AppContext.
 */
import { create } from 'zustand';
import type { Profile, Notification, AppSettings, Invoice } from '@/shared/types';
import { storage } from '@/shared/services/storageService';
import { DEFAULT_PROFILE } from '@/shared/utils/constants';
import { fmt } from '@/shared/utils/format';

// ─── Notification builder ────────────────────────────────────────────────────

export function buildNotifications(invoices: Invoice[]): Notification[] {
  const notifs: Notification[] = [];
  invoices.filter(i => i.status === 'overdue').forEach(i => {
    const days = Math.round((Date.now() - new Date(i.dueDate).getTime()) / 86400000);
    notifs.push({
      id: i.id,
      title: `Invoice ${i.number} Overdue`,
      sub: `${i.clientName} · ${days} day${days !== 1 ? 's' : ''} overdue · ₹${fmt(i.amount)}`,
      read: false,
      type: 'danger',
    });
  });
  invoices.filter(i => i.status === 'sent').forEach(i => {
    notifs.push({
      id: i.id + 1000,
      title: 'Payment Pending',
      sub: `${i.clientName} · ${i.number} · ₹${fmt(i.amount)}`,
      read: false,
      type: 'warning',
    });
  });
  return notifs;
}

// ─── State shape ─────────────────────────────────────────────────────────────

interface AppUIState {
  profile: Profile | null;
  dark: boolean;
  privacyMode: boolean;
  locked: boolean;
  notifications: Notification[];
  settings: AppSettings;
}

interface AppUIActions {
  /** Hydrate from localStorage (call once on mount) */
  hydrate: (invoices: Invoice[]) => void;
  toggleTheme: () => void;
  togglePrivacy: () => void;
  setProfile: (p: Profile) => void;
  saveSettings: (p: Partial<Profile>) => void;
  markNotifRead: (id: number) => void;
  markAllRead: () => void;
  refreshNotifications: (invoices: Invoice[]) => void;
  unlock: (passcode: string) => boolean;
  setupEncryption: (passcode: string) => void;
  setLocked: (locked: boolean) => void;
  /** Currency symbol shorthand */
  cs: () => string;
}

export const useAppStore = create<AppUIState & AppUIActions>()((set, get) => ({
  profile: null,
  dark: false,
  privacyMode: false,
  locked: false,
  notifications: [],
  settings: { sessionTimeout: 10, privacyMode: false, encryptionEnabled: false },

  hydrate: (invoices) => {
    const dark = localStorage.getItem('lx_dark') === '1';
    const profile = storage.load<Profile | null>('lx_profile', null);
    const notifications =
      storage.load<Notification[] | null>('lx_notifs', null) ?? buildNotifications(invoices);
    const settings = storage.load<AppSettings>('lx_settings', {
      sessionTimeout: 10,
      privacyMode: false,
      encryptionEnabled: false,
    });

    if (dark) document.documentElement.classList.add('dark');

    set({
      profile,
      dark,
      notifications,
      settings,
      locked: storage.isEncryptionSetup() && !storage.isUnlocked(),
    });
  },

  toggleTheme: () => {
    set(s => {
      const dark = !s.dark;
      document.documentElement.classList.toggle('dark', dark);
      localStorage.setItem('lx_dark', dark ? '1' : '0');
      return { dark };
    });
  },

  togglePrivacy: () => set(s => ({ privacyMode: !s.privacyMode })),

  setProfile: (p) => {
    storage.save('lx_profile', p);
    set({ profile: p });
  },

  saveSettings: (p) => {
    set(s => {
      const profile = { ...(s.profile || DEFAULT_PROFILE), ...p };
      storage.save('lx_profile', profile);
      return { profile };
    });
  },

  markNotifRead: (id) => {
    set(s => {
      const notifications = s.notifications.map(n => (n.id === id ? { ...n, read: true } : n));
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

  refreshNotifications: (invoices) => {
    set({ notifications: buildNotifications(invoices) });
  },

  unlock: (passcode) => {
    const ok = storage.unlock(passcode);
    if (ok) set({ locked: false });
    return ok;
  },

  setupEncryption: (passcode) => {
    storage.setupEncryption(passcode);
    set(s => ({ settings: { ...s.settings, encryptionEnabled: true } }));
  },

  setLocked: (locked) => set({ locked }),

  cs: () => get().profile?.currency || '₹',
}));
