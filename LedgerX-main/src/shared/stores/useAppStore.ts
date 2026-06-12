/**
 * useAppStore – shared UI & profile Zustand store (HARDENED v4)
 *
 * Critical fixes:
 *   C-1 / C-3 — All Zustand initial state now uses `storage.loadSync()` for
 *               safe synchronous reads. Encrypted keys return their defaults
 *               synchronously; the real data is hydrated asynchronously via
 *               `dataService.loadFromStorage()` after the user unlocks.
 *
 * Security additions:
 *   - `setupEncryption` uses the updated `StorageService.setupEncryption` which
 *     always generates a fresh salt (no salt reuse on repeated calls).
 *   - `changePasscode` exposed as a dedicated action (delegates to StorageService).
 *   - `unlockAttempts` and `lockoutRemainingMs` exposed so the AutoLock UI can
 *     show progressive warnings.
 */
import { create } from 'zustand';
import { StorageLockedError, StorageLockedOutError, storage } from '@/lib/storage';
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

function canPersistEncryptedData(): boolean {
  return !storage.isEncryptionSetup() || storage.isUnlocked();
}

// ── Type ──────────────────────────────────────────────────────────────────────

interface AppStoreState {
  profile:               Profile | null;
  dark:                  boolean;
  privacyMode:           boolean;
  locked:                boolean;
  unlocking:             boolean;
  unlockAttempts:        number;
  lockoutRemainingMs:    number;
  activeView:            ViewId;
  settings:              AppSettings;
  notifications:         Notification[];

  // Actions
  setProfile:            (profile: Profile) => Promise<void>;
  saveSettings:          (partial: Partial<Profile>) => Promise<void>;
  ensureProfile:         () => Promise<void>;
  setActiveView:         (view: ViewId) => void;
  toggleTheme:           () => void;
  togglePrivacy:         () => void;
  lock:                  () => void;
  unlock:                (passcode: string) => Promise<void>;
  setupEncryption:       (passcode: string) => Promise<void>;
  changePasscode:        (oldPasscode: string, newPasscode: string) => Promise<void>;
  markNotifRead:         (id: number) => Promise<void>;
  markAllRead:           () => Promise<void>;
  setNotifications:      (notifs: Notification[]) => Promise<void>;
  rebuildNotifications:  (invoices: Invoice[]) => Promise<void>;
  refreshLockoutState:   () => void;
}

// ── Safe synchronous initial dark mode (FIXED: no `document` access in module scope for tests) ──

function getInitialDark(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('lx_dark') === '1';
}

function applyDarkMode(dark: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', dark);
}

const initialDark = getInitialDark();
applyDarkMode(initialDark);

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStoreState>((set) => ({
  // FIXED C-1 / C-3: Use loadSync() — returns default for encrypted keys.
  // Real data is loaded after unlock by dataService.loadFromStorage().
  profile:            storage.loadSync<Profile | null>('lx_profile', null),
  dark:               initialDark,
  privacyMode:        false,
  locked:             storage.isEncryptionSetup() && !storage.isUnlocked(),
  unlocking:          false,
  unlockAttempts:     storage.getFailedAttemptCount(),
  lockoutRemainingMs: storage.getLockoutRemainingMs(),
  activeView:         'dashboard',
  settings:           storage.loadSync<AppSettings>('lx_settings', DEFAULT_SETTINGS),
  notifications:      [],  // populated asynchronously after hydration

  setProfile: async (profile) => {
    if (!canPersistEncryptedData()) return;
    try {
      await storage.save('lx_profile', profile);
      set({ profile });
    } catch (err) {
      console.error('[LedgerX] Failed to save profile:', err);
      throw err;
    }
  },

  saveSettings: async (partial) => {
    if (!canPersistEncryptedData()) return;
    try {
      const currentState = useAppStore.getState();
      const profile = { ...(currentState.profile ?? DEFAULT_PROFILE), ...partial };
      await storage.save('lx_profile', profile);
      set({ profile });
    } catch (err) {
      console.error('[LedgerX] Failed to save settings:', err);
      throw err;
    }
  },

  ensureProfile: async () => {
    if (!canPersistEncryptedData()) return;
    try {
      const { profile } = useAppStore.getState();
      if (profile) return;
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
      applyDarkMode(dark);
      localStorage.setItem('lx_dark', dark ? '1' : '0');
      return { dark };
    });
  },

  togglePrivacy: () => set(s => ({ privacyMode: !s.privacyMode })),

  lock: () => {
    storage.clearEncryptionKey();
    set({ locked: true });
  },

  unlock: async (passcode) => {
    const { unlocking } = useAppStore.getState();
    if (unlocking) return;

    set({ unlocking: true });
    try {
      const ok = await storage.unlock(passcode);
      if (ok) {
        set({
          locked: false,
          unlocking: false,
          unlockAttempts: 0,
          lockoutRemainingMs: 0,
        });
      } else {
        set({
          unlocking: false,
          unlockAttempts: storage.getFailedAttemptCount(),
          lockoutRemainingMs: storage.getLockoutRemainingMs(),
        });
        throw new Error('Incorrect passcode');
      }
    } catch (err) {
      set({
        unlocking: false,
        unlockAttempts: storage.getFailedAttemptCount(),
        lockoutRemainingMs: storage.getLockoutRemainingMs(),
      });
      if (err instanceof StorageLockedOutError) throw err;
      throw err;
    }
  },

  setupEncryption: async (passcode) => {
    set({ unlocking: true });
    try {
      await storage.setupEncryption(passcode);
      const { settings } = useAppStore.getState();
      const newSettings = { ...settings, encryptionEnabled: true };
      await storage.save('lx_settings', newSettings);
      set({ settings: newSettings, unlocking: false });
    } catch (err) {
      set({ unlocking: false });
      throw err;
    }
  },

  changePasscode: async (oldPasscode, newPasscode) => {
    set({ unlocking: true });
    try {
      await storage.changePasscode(oldPasscode, newPasscode);
      set({ unlocking: false });
    } catch (err) {
      set({ unlocking: false });
      throw err;
    }
  },

  markNotifRead: async (id) => {
    if (!canPersistEncryptedData()) return;
    try {
      const { notifications } = useAppStore.getState();
      const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
      await storage.save('lx_notifs', updated);
      set({ notifications: updated });
    } catch (err) {
      console.error('[LedgerX] Failed to mark notification read:', err);
      throw err;
    }
  },

  markAllRead: async () => {
    if (!canPersistEncryptedData()) return;
    try {
      const { notifications } = useAppStore.getState();
      const updated = notifications.map(n => ({ ...n, read: true }));
      await storage.save('lx_notifs', updated);
      set({ notifications: updated });
    } catch (err) {
      console.error('[LedgerX] Failed to mark all read:', err);
      throw err;
    }
  },

  setNotifications: async (notifications) => {
    if (!canPersistEncryptedData()) return;
    try {
      await storage.save('lx_notifs', notifications);
      set({ notifications });
    } catch (err) {
      console.error('[LedgerX] Failed to save notifications:', err);
      throw err;
    }
  },

  rebuildNotifications: async (invoices) => {
    if (!canPersistEncryptedData()) return;
    try {
      const notifications = buildNotifications(invoices);
      await storage.save('lx_notifs', notifications);
      set({ notifications });
    } catch (err) {
      console.error('[LedgerX] Failed to rebuild notifications:', err);
      throw err;
    }
  },

  refreshLockoutState: () => {
    set({
      unlockAttempts:     storage.getFailedAttemptCount(),
      lockoutRemainingMs: storage.getLockoutRemainingMs(),
    });
  },
}));
