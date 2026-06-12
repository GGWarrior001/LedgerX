/**
 * dataService – multi-store data orchestration (HARDENED v4)
 *
 * Fix M-4: `loadDemoData` now persists all demo data to encrypted storage so
 * that a page reload does not lose demo state.
 *
 * All operations use `AppError` codes for consistent error surfacing via
 * `handleError()`. No raw `console.error` calls remain.
 */
import { storage } from '@/lib/storage';
import { AppError } from '@/lib/errors';
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
  /**
   * Loads all app data from encrypted storage into Zustand stores.
   * Called by AppShell after every successful unlock.
   */
  async loadFromStorage(): Promise<void> {
    try {
      const [invoices, expenses, clients, vendors] = await Promise.all([
        storage.load<Invoice[]>('lx_invoices', []),
        storage.load<Expense[]>('lx_expenses', []),
        storage.load<Client[]>('lx_clients', []),
        storage.load<Vendor[]>('lx_vendors', []),
      ]);

      const [invId, expId, cliId, venId] = await Promise.all([
        storage.load<number>('lx_inv_id', invoices.length + 1),
        storage.load<number>('lx_exp_id', expenses.length + 1),
        storage.load<number>('lx_cli_id', clients.length + 1),
        storage.load<number>('lx_ven_id', vendors.length + 1),
      ]);

      useInvoiceStore.getState().hydrate(invoices, invId);
      useExpenseStore.getState().hydrate(expenses, expId);
      useClientStore.getState().hydrate(clients, cliId);
      useVendorStore.getState().hydrate(vendors, venId);

      const notifs = await storage.load('lx_notifs', []);
      await useAppStore.getState().setNotifications(notifs);
    } catch (err) {
      throw new AppError('STORAGE_ERROR', 'Failed to load data from storage', err);
    }
  },

  async exportData(): Promise<{
    invoices: Invoice[];
    expenses: Expense[];
    clients:  Client[];
    vendors:  Vendor[];
    profile:  Profile | null;
  }> {
    try {
      const [invoices, expenses, clients, vendors, profile] = await Promise.all([
        storage.exportData<Invoice[]>('lx_invoices', []),
        storage.exportData<Expense[]>('lx_expenses', []),
        storage.exportData<Client[]>('lx_clients', []),
        storage.exportData<Vendor[]>('lx_vendors', []),
        storage.exportData<Profile | null>('lx_profile', null),
      ]);
      return { invoices, expenses, clients, vendors, profile };
    } catch (err) {
      throw new AppError('STORAGE_ERROR', 'Failed to export data', err);
    }
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
      throw new AppError('STORAGE_ERROR', 'Failed to reset data', err);
    }
  },

  /**
   * Hydrates every store with the bundled demo dataset AND persists to storage.
   *
   * FIX M-4: Previously only hydrated in-memory stores; demo data was lost
   * on page reload. Now saves to encrypted storage before hydrating.
   */
  async loadDemoData(): Promise<void> {
    try {
      const invoices = [...DEFAULT_INVOICES];
      const expenses = [...DEFAULT_EXPENSES];
      const clients  = [...DEFAULT_CLIENTS];
      const vendors  = [...DEFAULT_VENDORS];
      const nextInvId = 7;
      const nextExpId = 7;
      const nextCliId = 4;
      const nextVenId = 5;

      // Persist before hydrating — so reload restores demo state
      await Promise.all([
        storage.save('lx_invoices', invoices),
        storage.save('lx_expenses', expenses),
        storage.save('lx_clients',  clients),
        storage.save('lx_vendors',  vendors),
        storage.save('lx_inv_id',   nextInvId),
        storage.save('lx_exp_id',   nextExpId),
        storage.save('lx_cli_id',   nextCliId),
        storage.save('lx_ven_id',   nextVenId),
      ]);

      useInvoiceStore.getState().hydrate(invoices, nextInvId);
      useExpenseStore.getState().hydrate(expenses, nextExpId);
      useClientStore.getState().hydrate(clients,  nextCliId);
      useVendorStore.getState().hydrate(vendors,  nextVenId);

      await useAppStore.getState().rebuildNotifications(invoices);
    } catch (err) {
      throw new AppError('STORAGE_ERROR', 'Failed to load demo data', err);
    }
  },

  /** Removes all domain keys from localStorage and resets stores to empty. */
  async loadFreshData(): Promise<void> {
    try {
      const keysToRemove = Object.values(STORAGE_KEYS).filter(
        k => k !== STORAGE_KEYS.PROFILE &&
             k !== STORAGE_KEYS.DARK &&
             k !== STORAGE_KEYS.SETTINGS
      );
      keysToRemove.forEach(k => storage.remove(k));

      useInvoiceStore.getState().hydrate([], 1);
      useExpenseStore.getState().hydrate([], 1);
      useClientStore.getState().hydrate([], 1);
      useVendorStore.getState().hydrate([], 1);
      await useAppStore.getState().setNotifications([]);
    } catch (err) {
      throw new AppError('STORAGE_ERROR', 'Failed to reset to fresh state', err);
    }
  },

  /** Imports data from a JSON backup, fully replacing current transactional data. */
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

      const nextInvId = safeNextId(invoices, data.nextInvId);
      const nextExpId = safeNextId(expenses, data.nextExpId);
      const nextCliId = safeNextId(clients, data.nextClientId);
      const nextVenId = safeNextId(vendors, data.nextVendorId);

      // Persist imported data to storage
      await Promise.all([
        storage.save('lx_invoices', invoices),
        storage.save('lx_expenses', expenses),
        storage.save('lx_clients',  clients),
        storage.save('lx_vendors',  vendors),
        storage.save('lx_inv_id',   nextInvId),
        storage.save('lx_exp_id',   nextExpId),
        storage.save('lx_cli_id',   nextCliId),
        storage.save('lx_ven_id',   nextVenId),
      ]);

      useInvoiceStore.getState().hydrate(invoices, nextInvId);
      useExpenseStore.getState().hydrate(expenses, nextExpId);
      useClientStore.getState().hydrate(clients,  nextCliId);
      useVendorStore.getState().hydrate(vendors,  nextVenId);

      const profile = sanitizeProfile(data.profile);
      if (profile) {
        await useAppStore.getState().setProfile(profile);
      }

      await useAppStore.getState().rebuildNotifications(invoices);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('STORAGE_ERROR', 'Failed to import data', err);
    }
  },
};
