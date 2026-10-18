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
import {
  safeNextId,
  sanitizeClients,
  sanitizeExpenses,
  sanitizeInvoices,
  sanitizeProfile,
  sanitizeVendors,
} from '@/lib/validation';
import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useClientStore }  from '@/features/clients/store/useClientStore';
import { useVendorStore }  from '@/features/vendors/store/useVendorStore';
import { useAppStore }     from '../stores/useAppStore';

export const dataService = {
  async loadFromStorage(): Promise<void> {
    try {
      const invoices = await storage.load<Invoice[]>('lx_invoices', []);
      const expenses = await storage.load<Expense[]>('lx_expenses', []);
      const clients = await storage.load<Client[]>('lx_clients', []);
      const vendors = await storage.load<Vendor[]>('lx_vendors', []);

      const invId = await storage.load<number>('lx_inv_id', invoices.length + 1);
      const expId = await storage.load<number>('lx_exp_id', expenses.length + 1);
      const cliId = await storage.load<number>('lx_cli_id', clients.length + 1);
      const venId = await storage.load<number>('lx_ven_id', vendors.length + 1);

      useInvoiceStore.getState().hydrate(invoices, invId);
      useExpenseStore.getState().hydrate(expenses, expId);
      useClientStore.getState().hydrate(clients, cliId);
      useVendorStore.getState().hydrate(vendors, venId);
      
      const notifs = await storage.load('lx_notifs', []);
      await useAppStore.getState().setNotifications(notifs);
    } catch (err) {
      console.error('[LedgerX] Failed to load from storage:', err);
      throw err;
    }
  },

  async exportData(): Promise<{
    invoices: Invoice[];
    expenses: Expense[];
    clients: Client[];
    vendors: Vendor[];
    profile: Profile | null;
  }> {
    return {
      invoices: await storage.exportData<Invoice[]>('lx_invoices', []),
      expenses: await storage.exportData<Expense[]>('lx_expenses', []),
      clients: await storage.exportData<Client[]>('lx_clients', []),
      vendors: await storage.exportData<Vendor[]>('lx_vendors', []),
      profile: await storage.exportData<Profile | null>('lx_profile', null),
    };
  },

  /** Clears all transactional data; keeps profile, dark, encryption keys. */
  async resetData(): Promise<void> {
    try {
      storage.clearAppData();
      useInvoiceStore.getState().reset();
      useExpenseStore.getState().reset();
      useClientStore.getState().reset();
      useVendorStore.getState().reset();
      
      await useAppStore.getState().setNotifications([]);
    } catch (err) {
      console.error('[LedgerX] Failed to reset data:', err);
      throw err;
    }
  },

  /** Hydrates every store with the bundled demo dataset. */
  async loadDemoData(): Promise<void> {
    try {
      useInvoiceStore.getState().hydrate([...DEFAULT_INVOICES], 7);
      useExpenseStore.getState().hydrate([...DEFAULT_EXPENSES], 7);
      useClientStore.getState().hydrate([...DEFAULT_CLIENTS], 4);
      useVendorStore.getState().hydrate([...DEFAULT_VENDORS], 5);
      await useAppStore.getState().rebuildNotifications(DEFAULT_INVOICES);
    } catch (err) {
      console.error('[LedgerX] Failed to load demo data:', err);
      throw err;
    }
  },

  /** Removes all domain keys from localStorage and resets stores to empty. */
  async loadFreshData(): Promise<void> {
    try {
      Object.values(STORAGE_KEYS)
        .filter(k => k !== STORAGE_KEYS.PROFILE && k !== STORAGE_KEYS.DARK && k !== STORAGE_KEYS.SETTINGS)
        .forEach(k => storage.remove(k));
      useInvoiceStore.getState().hydrate([], 1);
      useExpenseStore.getState().hydrate([], 1);
      useClientStore.getState().hydrate([], 1);
      useVendorStore.getState().hydrate([], 1);
      await useAppStore.getState().setNotifications([]);
    } catch (err) {
      console.error('[LedgerX] Failed to load fresh data:', err);
      throw err;
    }
  },

  /** Imports data from a JSON backup, merging with current state where needed. */
  async importData(data: Record<string, unknown>): Promise<void> {
    try {
      const invoices = Array.isArray(data.invoices)
        ? sanitizeInvoices(data.invoices)
        : useInvoiceStore.getState().invoices;

      const expenses = Array.isArray(data.expenses)
        ? sanitizeExpenses(data.expenses)
        : useExpenseStore.getState().expenses;

      const clients = Array.isArray(data.clients)
        ? sanitizeClients(data.clients)
        : useClientStore.getState().clients;

      const vendors = Array.isArray(data.vendors)
        ? sanitizeVendors(data.vendors)
        : useVendorStore.getState().vendors;

      useInvoiceStore.getState().hydrate(invoices, safeNextId(invoices, data.nextInvId));
      useExpenseStore.getState().hydrate(expenses, safeNextId(expenses, data.nextExpId));
      useClientStore.getState().hydrate(clients, safeNextId(clients, data.nextClientId));
      useVendorStore.getState().hydrate(vendors, safeNextId(vendors, data.nextVendorId));

      const profile = sanitizeProfile(data.profile);
      if (profile) {
        await useAppStore.getState().setProfile(profile);
      }

      await useAppStore.getState().rebuildNotifications(invoices);
    } catch (err) {
      console.error('[LedgerX] Failed to import data:', err);
      throw err;
    }
  },
};
