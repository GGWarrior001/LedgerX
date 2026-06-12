/**
 * AppContext – backward-compatible facade over the Zustand stores.
 *
 * `AppProvider` is now a no-op: state lives entirely in Zustand.
 * `useApp()` composes from multiple domain stores so that every
 * existing component continues to work without modification.
 */
import React from 'react';
import type { Invoice, Expense, Client, Vendor, Profile, Notification, ViewId, AppSettings } from '@/lib/types';
import { useAppStore }     from '@/shared/stores/useAppStore';
import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useClientStore }  from '@/features/clients/store/useClientStore';
import { useVendorStore }  from '@/features/vendors/store/useVendorStore';
import { invoiceService }  from '@/features/invoices/services/invoiceService';
import { expenseService }  from '@/features/expenses/services/expenseService';
import { clientService }   from '@/features/clients/services/clientService';
import { vendorService }   from '@/features/vendors/services/vendorService';
import { dataService }     from '@/shared/services/dataService';

// Re-export the combined type for any legacy import
export interface AppContextType {
  profile:      Profile | null;
  invoices:     Invoice[];
  expenses:     Expense[];
  clients:      Client[];
  vendors:      Vendor[];
  notifications: Notification[];
  activeView:   ViewId;
  dark:         boolean;
  privacyMode:  boolean;
  locked:       boolean;
  settings:     AppSettings;
  cs:           string;
  setActiveView:    (v: ViewId)              => void;
  toggleTheme:      ()                        => void;
  togglePrivacy:    ()                        => void;
  setProfile:       (p: Profile)             => Promise<void>;
  saveSettings:     (p: Partial<Profile>)    => Promise<void>;
  addInvoice:       (inv: Omit<Invoice,  'id'|'number'|'clientInitials'|'clientColor'>) => Promise<Invoice>;
  addExpense:       (exp: Omit<Expense,  'id'>)                                         => Promise<Expense>;
  addClient:        (cli: Omit<Client,   'id'|'initials'|'color'|'billed'|'outstanding'|'invoices'>) => Promise<Client>;
  addVendor:        (ven: Omit<Vendor,   'id'|'initials'|'color'|'totalSpent'>)         => Promise<Vendor>;
  resetData:        ()                        => Promise<void>;
  loadDemoData:     ()                        => Promise<void>;
  loadFreshData:    ()                        => Promise<void>;
  importData:       (data: Record<string, unknown>) => Promise<void>;
  markNotifRead:    (id: number)             => Promise<void>;
  markAllRead:      ()                        => Promise<void>;
  unlock:           (passcode: string)       => boolean;
  setupEncryption:  (passcode: string)       => void;
}

/** No-op provider – Zustand stores initialize themselves. */
export function AppProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Drop-in replacement for the old `useApp()` hook.
 * Composes reads from Zustand stores and delegates writes to domain services.
 */
export function useApp(): AppContextType {
  const app      = useAppStore();
  const invoices = useInvoiceStore(s => s.invoices);
  const expenses = useExpenseStore(s => s.expenses);
  const clients  = useClientStore(s => s.clients);
  const vendors  = useVendorStore(s => s.vendors);

  return {
    // State
    profile:       app.profile,
    invoices,
    expenses,
    clients,
    vendors,
    notifications: app.notifications,
    activeView:    app.activeView,
    dark:          app.dark,
    privacyMode:   app.privacyMode,
    locked:        app.locked,
    settings:      app.settings,
    cs:            app.profile?.currency ?? '₹',

    // UI actions (from useAppStore)
    setActiveView:   app.setActiveView,
    toggleTheme:     app.toggleTheme,
    togglePrivacy:   app.togglePrivacy,
    setProfile:      app.setProfile,
    saveSettings:    app.saveSettings,
    unlock:          app.unlock,
    setupEncryption: app.setupEncryption,
    markNotifRead:   app.markNotifRead,
    markAllRead:     app.markAllRead,

    // Domain mutations (via domain services)
    addInvoice:  (inv) => invoiceService.addInvoice(inv),
    addExpense:  (exp) => expenseService.addExpense(exp),
    addClient:   (cli) => clientService.addClient(cli),
    addVendor:   (ven) => vendorService.addVendor(ven),

    // Multi-store orchestration (via dataService)
    resetData:    () => dataService.resetData(),
    loadDemoData: () => dataService.loadDemoData(),
    loadFreshData: () => dataService.loadFreshData(),
    importData:   (data) => dataService.importData(data),
  };
}
