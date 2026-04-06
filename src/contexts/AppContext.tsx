import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Invoice, Expense, Client, Vendor, Profile, Notification, ViewId, AppSettings } from '@/lib/types';
import { storage } from '@/lib/storage';
import { getInitials, fmt, DEFAULT_INVOICES, DEFAULT_EXPENSES, DEFAULT_CLIENTS, DEFAULT_VENDORS } from '@/lib/constants';
import { fetchCloudData, saveCloudData, CloudData, addLedgerEntry, fetchLedgerEntries } from '@/lib/firestoreSync';

const DEFAULT_PROFILE: Profile = { name: '', role: 'Admin', city: '', businessName: 'LedgerX', fiscalYear: 'Apr-Mar', currency: '₹', dataChoice: 'demo' };

interface AppState {
  profile: Profile | null;
  invoices: Invoice[];
  expenses: Expense[];
  clients: Client[];
  vendors: Vendor[];
  notifications: Notification[];
  activeView: ViewId;
  dark: boolean;
  privacyMode: boolean;
  locked: boolean;
  nextInvId: number;
  nextExpId: number;
  nextClientId: number;
  nextVendorId: number;
  settings: AppSettings;
}

interface AppContextType extends AppState {
  setActiveView: (v: ViewId) => void;
  toggleTheme: () => void;
  togglePrivacy: () => void;
  setProfile: (p: Profile) => void;
  addInvoice: (inv: Omit<Invoice, 'id' | 'number' | 'clientInitials' | 'clientColor'>) => void;
  addExpense: (exp: Omit<Expense, 'id'>) => void;
  addClient: (cli: Omit<Client, 'id' | 'initials' | 'color' | 'billed' | 'outstanding' | 'invoices'>) => void;
  addVendor: (ven: Omit<Vendor, 'id' | 'initials' | 'color' | 'totalSpent'>) => void;
  saveSettings: (p: Partial<Profile>) => void;
  resetData: () => void;
  loadDemoData: () => void;
  loadFreshData: () => void;
  importData: (data: Record<string, unknown>) => void;
  markNotifRead: (id: number) => void;
  markAllRead: () => void;
  unlock: (passcode: string) => boolean;
  setupEncryption: (passcode: string) => void;
  cs: string;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function buildNotifications(invoices: Invoice[]): Notification[] {
  const notifs: Notification[] = [];
  invoices.filter(i => i.status === 'overdue').forEach(i => {
    const days = Math.round((Date.now() - new Date(i.dueDate).getTime()) / 86400000);
    notifs.push({ id: i.id, title: `Invoice ${i.number} Overdue`, sub: `${i.clientName} · ${days} day${days !== 1 ? 's' : ''} overdue · ₹${fmt(i.amount)}`, read: false, type: 'danger' });
  });
  invoices.filter(i => i.status === 'sent').forEach(i => {
    notifs.push({ id: i.id + 1000, title: 'Payment Pending', sub: `${i.clientName} · ${i.number} · ₹${fmt(i.amount)}`, read: false, type: 'warning' });
  });
  return notifs;
}

export function AppProvider({ children, cloudUid }: { children: React.ReactNode; cloudUid?: string | null }) {
  const [state, setState] = useState<AppState>(() => {
    const dark = localStorage.getItem('lx_dark') === '1';
    const profile = storage.load<Profile | null>('lx_profile', null);
    const invoices = storage.load<Invoice[]>('lx_invoices', []);
    const expenses = storage.load<Expense[]>('lx_expenses', []);
    const clients = storage.load<Client[]>('lx_clients', []);
    const vendors = storage.load<Vendor[]>('lx_vendors', []);
    const notifications = storage.load<Notification[] | null>('lx_notifs', null) ?? buildNotifications(invoices);
    const settings = storage.load<AppSettings>('lx_settings', { sessionTimeout: 10, privacyMode: false, encryptionEnabled: false });

    if (dark) document.documentElement.classList.add('dark');

    return {
      profile,
      invoices,
      expenses,
      clients,
      vendors,
      notifications,
      activeView: 'dashboard',
      dark,
      privacyMode: false,
      locked: storage.isEncryptionSetup() && !storage.isUnlocked(),
      nextInvId: storage.load('lx_inv_id', 1),
      nextExpId: storage.load('lx_exp_id', 1),
      nextClientId: storage.load('lx_cli_id', 1),
      nextVendorId: storage.load('lx_ven_id', 1),
      settings,
    };
  });

  // Auto-lock timer
  const lastActivity = useRef(Date.now());
  useEffect(() => {
    if (!storage.isEncryptionSetup() || state.locked) return;
    const timeout = state.settings.sessionTimeout * 60 * 1000;
    const handler = () => { lastActivity.current = Date.now(); };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, handler));
    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current > timeout) {
        setState(s => ({ ...s, locked: true }));
      }
    }, 30000);
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearInterval(interval);
    };
  }, [state.locked, state.settings.sessionTimeout]);

  const persist = useCallback((s: AppState) => {
    storage.save('lx_invoices', s.invoices);
    storage.save('lx_expenses', s.expenses);
    storage.save('lx_clients', s.clients);
    storage.save('lx_vendors', s.vendors);
    storage.save('lx_notifs', s.notifications);
    storage.save('lx_inv_id', s.nextInvId);
    storage.save('lx_exp_id', s.nextExpId);
    storage.save('lx_cli_id', s.nextClientId);
    storage.save('lx_ven_id', s.nextVendorId);
  }, []);

  // Cloud persist: save a snapshot to Firestore whenever the uid or core data changes
  const cloudPersist = useCallback((s: AppState, uid: string) => {
    const data: CloudData = {
      invoices: s.invoices,
      expenses: s.expenses,
      clients: s.clients,
      vendors: s.vendors,
      profile: s.profile,
      nextInvId: s.nextInvId,
      nextExpId: s.nextExpId,
      nextClientId: s.nextClientId,
      nextVendorId: s.nextVendorId,
    };
    saveCloudData(uid, data);
  }, []);

  // Unified persist: local storage + cloud (when signed in)
  const persistAll = useCallback((s: AppState) => {
    persist(s);
    if (cloudUid) cloudPersist(s, cloudUid);
  }, [persist, cloudPersist, cloudUid]);

  // Fetch cloud data when a user signs in (cloudUid becomes non-null)
  const prevCloudUidRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (cloudUid === prevCloudUidRef.current) return;
    prevCloudUidRef.current = cloudUid;
    if (!cloudUid) return;
    Promise.all([
      fetchCloudData(cloudUid),
      fetchLedgerEntries(cloudUid),
    ]).then(([cloud, entries]) => {
      // Merge: entries subcollection takes precedence over the snapshot doc
      // if it contains data; otherwise fall back to the snapshot.
      const hasEntries = entries.invoices.length > 0 || entries.expenses.length > 0;
      const invoices = hasEntries ? entries.invoices : (cloud?.invoices ?? []);
      const expenses = hasEntries ? entries.expenses : (cloud?.expenses ?? []);
      if (!cloud && !hasEntries) return;
      setState(s => {
        const newState = {
          ...s,
          invoices,
          expenses,
          clients: cloud?.clients ?? s.clients,
          vendors: cloud?.vendors ?? s.vendors,
          profile: cloud?.profile ?? s.profile,
          nextInvId: cloud?.nextInvId ?? s.nextInvId,
          nextExpId: cloud?.nextExpId ?? s.nextExpId,
          nextClientId: cloud?.nextClientId ?? s.nextClientId,
          nextVendorId: cloud?.nextVendorId ?? s.nextVendorId,
          notifications: buildNotifications(invoices),
        };
        persist(newState);
        if (cloud?.profile) storage.save('lx_profile', cloud.profile);
        return newState;
      });
    }).catch(err => {
      console.error('[LedgerX] Cloud sync error:', err);
    });
  }, [cloudUid, persist]);

  const setActiveView = useCallback((v: ViewId) => setState(s => ({ ...s, activeView: v })), []);

  const toggleTheme = useCallback(() => {
    setState(s => {
      const dark = !s.dark;
      document.documentElement.classList.toggle('dark', dark);
      localStorage.setItem('lx_dark', dark ? '1' : '0');
      return { ...s, dark };
    });
  }, []);

  const togglePrivacy = useCallback(() => setState(s => ({ ...s, privacyMode: !s.privacyMode })), []);

  const setProfile = useCallback((p: Profile) => {
    storage.save('lx_profile', p);
    setState(s => ({ ...s, profile: p }));
  }, []);

  const addInvoice = useCallback((inv: Omit<Invoice, 'id' | 'number' | 'clientInitials' | 'clientColor'>) => {
    setState(s => {
      const id = s.nextInvId;
      const cli = s.clients.find(c => c.name === inv.clientName);
      const newInv: Invoice = {
        ...inv,
        id,
        number: `INV-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`,
        clientInitials: cli?.initials || getInitials(inv.clientName),
        clientColor: cli?.color || '#6366F1',
      };
      const clients = s.clients.map(c => {
        if (c.name === inv.clientName) {
          return { ...c, billed: c.billed + inv.amount, outstanding: inv.status === 'sent' ? c.outstanding + inv.amount : c.outstanding, invoices: c.invoices + 1 };
        }
        return c;
      });
      const newState = { ...s, invoices: [newInv, ...s.invoices], clients, nextInvId: id + 1 };
      persistAll(newState);
      if (cloudUid) addLedgerEntry(cloudUid, 'invoice', newInv).catch(() => {});
      return newState;
    });
  }, [persistAll, cloudUid]);

  const addExpense = useCallback((exp: Omit<Expense, 'id'>) => {
    setState(s => {
      const id = s.nextExpId;
      const newExp = { ...exp, id };
      const newState = { ...s, expenses: [newExp, ...s.expenses], nextExpId: id + 1 };
      persistAll(newState);
      if (cloudUid) addLedgerEntry(cloudUid, 'expense', newExp).catch(() => {});
      return newState;
    });
  }, [persistAll, cloudUid]);

  const addClient = useCallback((cli: Omit<Client, 'id' | 'initials' | 'color' | 'billed' | 'outstanding' | 'invoices'>) => {
    setState(s => {
      const id = s.nextClientId;
      const colors = ['#6366F1','#EC4899','#10B981','#F97316','#8B5CF6','#14B8A6','#F59E0B','#3B82F6'];
      const newClient: Client = { ...cli, id, initials: getInitials(cli.name), color: colors[id % colors.length], billed: 0, outstanding: 0, invoices: 0 };
      const newState = { ...s, clients: [...s.clients, newClient], nextClientId: id + 1 };
      persistAll(newState);
      return newState;
    });
  }, [persistAll]);

  const addVendor = useCallback((ven: Omit<Vendor, 'id' | 'initials' | 'color' | 'totalSpent'>) => {
    setState(s => {
      const id = s.nextVendorId;
      const colors = ['#F59E0B','#10B981','#8B5CF6','#3B82F6','#EC4899','#6366F1'];
      const newVendor: Vendor = { ...ven, id, initials: getInitials(ven.name), color: colors[id % colors.length], totalSpent: 0 };
      const newState = { ...s, vendors: [...s.vendors, newVendor], nextVendorId: id + 1 };
      persistAll(newState);
      return newState;
    });
  }, [persistAll]);

  const saveSettingsFn = useCallback((p: Partial<Profile>) => {
    setState(s => {
      const profile = { ...(s.profile || DEFAULT_PROFILE), ...p };
      storage.save('lx_profile', profile);
      return { ...s, profile };
    });
  }, []);

  const resetData = useCallback(() => {
    storage.clearAppData();
    setState(s => ({ ...s, invoices: [], expenses: [], clients: [], vendors: [], notifications: [], nextInvId: 1, nextExpId: 1, nextClientId: 1, nextVendorId: 1 }));
  }, []);

  const loadDemoData = useCallback(() => {
    setState(s => {
      const newState = {
        ...s,
        invoices: [...DEFAULT_INVOICES],
        expenses: [...DEFAULT_EXPENSES],
        clients: [...DEFAULT_CLIENTS],
        vendors: [...DEFAULT_VENDORS],
        nextInvId: 7, nextExpId: 7, nextClientId: 4, nextVendorId: 5,
        notifications: buildNotifications(DEFAULT_INVOICES),
      };
      persistAll(newState);
      return newState;
    });
  }, [persistAll]);

  const loadFreshData = useCallback(() => {
    setState(s => {
      const newState = { ...s, invoices: [], expenses: [], clients: [], vendors: [], notifications: [], nextInvId: 1, nextExpId: 1, nextClientId: 1, nextVendorId: 1 };
      ['lx_invoices','lx_expenses','lx_clients','lx_vendors','lx_notifs','lx_inv_id','lx_exp_id','lx_cli_id','lx_ven_id'].forEach(k => storage.remove(k));
      return newState;
    });
  }, []);

  const importData = useCallback((data: Record<string, unknown>) => {
    setState(s => {
      const invoices = Array.isArray(data.invoices) ? data.invoices as Invoice[] : s.invoices;
      const expenses = Array.isArray(data.expenses) ? data.expenses as Expense[] : s.expenses;
      const clients = Array.isArray(data.clients) ? data.clients as Client[] : s.clients;
      const vendors = Array.isArray(data.vendors) ? data.vendors as Vendor[] : s.vendors;
      const profile = data.profile && typeof data.profile === 'object' ? data.profile as Profile : s.profile;
      if (profile) storage.save('lx_profile', profile);
      const newState = { ...s, invoices, expenses, clients, vendors, profile, notifications: buildNotifications(invoices) };
      persistAll(newState);
      return newState;
    });
  }, [persistAll]);

  const markNotifRead = useCallback((id: number) => {
    setState(s => {
      const notifications = s.notifications.map(n => n.id === id ? { ...n, read: true } : n);
      storage.save('lx_notifs', notifications);
      return { ...s, notifications };
    });
  }, []);

  const markAllRead = useCallback(() => {
    setState(s => {
      const notifications = s.notifications.map(n => ({ ...n, read: true }));
      storage.save('lx_notifs', notifications);
      return { ...s, notifications };
    });
  }, []);

  const unlock = useCallback((passcode: string) => {
    const ok = storage.unlock(passcode);
    if (ok) setState(s => ({ ...s, locked: false }));
    return ok;
  }, []);

  const setupEncryption = useCallback((passcode: string) => {
    storage.setupEncryption(passcode);
    setState(s => ({ ...s, settings: { ...s.settings, encryptionEnabled: true } }));
  }, []);

  const cs = state.profile?.currency || '₹';

  return (
    <AppContext.Provider value={{
      ...state, cs,
      setActiveView, toggleTheme, togglePrivacy, setProfile,
      addInvoice, addExpense, addClient, addVendor,
      saveSettings: saveSettingsFn, resetData, loadDemoData, loadFreshData, importData,
      markNotifRead, markAllRead, unlock, setupEncryption,
    }}>
      {children}
    </AppContext.Provider>
  );
}
