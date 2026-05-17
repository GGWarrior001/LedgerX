/**
 * dataService – multi-store data orchestration.
 *
 * Handles operations that span more than one domain store:
 *   - resetData   – wipe all app data while preserving profile/settings
 *   - loadDemoData – hydrate stores with bundled sample data
 *   - loadFreshData – clear localStorage keys and reset stores
 *   - importData  – bulk-import from a JSON backup file
 */
import { storage } from '@/lib/storage';
import { STORAGE_KEYS } from '../services/storageService';
import {
  DEFAULT_INVOICES,
  DEFAULT_EXPENSES,
  DEFAULT_CLIENTS,
  DEFAULT_VENDORS,
} from '@/lib/constants';
import type { Invoice, Expense, Client, Vendor, Profile } from '@/lib/types';
import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useClientStore }  from '@/features/clients/store/useClientStore';
import { useVendorStore }  from '@/features/vendors/store/useVendorStore';
import { useAppStore }     from '../stores/useAppStore';

export const dataService = {
  loadFromStorage(): void {
    const invoices = storage.load<Invoice[]>('lx_invoices', []);
    const expenses = storage.load<Expense[]>('lx_expenses', []);
    const clients = storage.load<Client[]>('lx_clients', []);
    const vendors = storage.load<Vendor[]>('lx_vendors', []);

    useInvoiceStore.getState().hydrate(invoices, storage.load<number>('lx_inv_id', invoices.length + 1));
    useExpenseStore.getState().hydrate(expenses, storage.load<number>('lx_exp_id', expenses.length + 1));
    useClientStore.getState().hydrate(clients, storage.load<number>('lx_cli_id', clients.length + 1));
    useVendorStore.getState().hydrate(vendors, storage.load<number>('lx_ven_id', vendors.length + 1));
    useAppStore.getState().setNotifications(storage.load('lx_notifs', []));
  },

  exportData(): {
    invoices: Invoice[];
    expenses: Expense[];
    clients: Client[];
    vendors: Vendor[];
    profile: Profile | null;
  } {
    return {
      invoices: storage.exportData<Invoice[]>('lx_invoices', []),
      expenses: storage.exportData<Expense[]>('lx_expenses', []),
      clients: storage.exportData<Client[]>('lx_clients', []),
      vendors: storage.exportData<Vendor[]>('lx_vendors', []),
      profile: storage.exportData<Profile | null>('lx_profile', null),
    };
  },

  /** Clears all transactional data; keeps profile, dark, encryption keys. */
  resetData(): void {
    storage.clearAppData();
    useInvoiceStore.getState().reset();
    useExpenseStore.getState().reset();
    useClientStore.getState().reset();
    useVendorStore.getState().reset();
    useAppStore.getState().setNotifications([]);
  },

  /** Hydrates every store with the bundled demo dataset. */
  loadDemoData(): void {
    useInvoiceStore.getState().hydrate([...DEFAULT_INVOICES], 7);
    useExpenseStore.getState().hydrate([...DEFAULT_EXPENSES], 7);
    useClientStore.getState().hydrate([...DEFAULT_CLIENTS], 4);
    useVendorStore.getState().hydrate([...DEFAULT_VENDORS], 5);
    useAppStore.getState().rebuildNotifications(DEFAULT_INVOICES);
  },

  /** Removes all domain keys from localStorage and resets stores to empty. */
  loadFreshData(): void {
    Object.values(STORAGE_KEYS)
      .filter(k => k !== STORAGE_KEYS.PROFILE && k !== STORAGE_KEYS.DARK && k !== STORAGE_KEYS.SETTINGS)
      .forEach(k => storage.remove(k));
    useInvoiceStore.getState().hydrate([], 1);
    useExpenseStore.getState().hydrate([], 1);
    useClientStore.getState().hydrate([], 1);
    useVendorStore.getState().hydrate([], 1);
    useAppStore.getState().setNotifications([]);
  },

  /** Imports data from a JSON backup, merging with current state where needed. */
  importData(data: Record<string, unknown>): void {
    const invoices = Array.isArray(data.invoices)
      ? (data.invoices as Invoice[])
      : useInvoiceStore.getState().invoices;

    const expenses = Array.isArray(data.expenses)
      ? (data.expenses as Expense[])
      : useExpenseStore.getState().expenses;

    const clients = Array.isArray(data.clients)
      ? (data.clients as Client[])
      : useClientStore.getState().clients;

    const vendors = Array.isArray(data.vendors)
      ? (data.vendors as Vendor[])
      : useVendorStore.getState().vendors;

    useInvoiceStore.getState().hydrate(invoices, invoices.length + 1);
    useExpenseStore.getState().hydrate(expenses, expenses.length + 1);
    useClientStore.getState().hydrate(clients, clients.length + 1);
    useVendorStore.getState().hydrate(vendors, vendors.length + 1);

    if (data.profile && typeof data.profile === 'object') {
      const profile = data.profile as Profile;
      storage.save('lx_profile', profile);
      useAppStore.getState().setProfile(profile);
    }

    useAppStore.getState().rebuildNotifications(invoices);
  },
};
