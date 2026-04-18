/**
 * Cloud sync service — orchestrates data flow between local stores and Firestore.
 *
 * Provides a `syncFromCloud` to pull data on sign-in and `syncToCloud` to push
 * the current store snapshot whenever local data changes.
 */
import { fetchCloudData, fetchLedgerEntries, saveCloudData, addLedgerEntry } from '@/shared/api/firestoreClient';
import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useClientStore } from '@/features/clients/store/useClientStore';
import { useVendorStore } from '@/features/vendors/store/useVendorStore';
import { useAppStore, buildNotifications } from '@/shared/stores/useAppStore';
import { storage } from '@/shared/services/storageService';
import type { Invoice, Expense, CloudData, EntryType } from '@/shared/types';

/**
 * Pull data from Firestore when a user signs in (or the page reloads while
 * already signed in).
 */
export async function syncFromCloud(uid: string): Promise<void> {
  try {
    const [cloud, entries] = await Promise.all([
      fetchCloudData(uid),
      fetchLedgerEntries(uid),
    ]);

    const hasEntries = entries.invoices.length > 0 || entries.expenses.length > 0;
    const invoices = hasEntries ? entries.invoices : (cloud?.invoices ?? []);
    const expenses = hasEntries ? entries.expenses : (cloud?.expenses ?? []);

    if (!cloud && !hasEntries) return;

    // Hydrate each domain store
    useInvoiceStore.getState().setInvoices(invoices, cloud?.nextInvId);
    useExpenseStore.getState().setExpenses(expenses, cloud?.nextExpId);

    if (cloud?.clients) useClientStore.getState().setClients(cloud.clients, cloud.nextClientId);
    if (cloud?.vendors) useVendorStore.getState().setVendors(cloud.vendors, cloud.nextVendorId);

    if (cloud?.profile) {
      useAppStore.getState().setProfile(cloud.profile);
      storage.save('lx_profile', cloud.profile);
    }

    useAppStore.getState().refreshNotifications(invoices);
  } catch (err) {
    console.error('[LedgerX] Cloud sync error:', err);
  }
}

/**
 * Push a full data snapshot to Firestore (called after local mutations).
 */
export function syncToCloud(uid: string): void {
  const { invoices, nextInvId } = useInvoiceStore.getState();
  const { expenses, nextExpId } = useExpenseStore.getState();
  const { clients, nextClientId } = useClientStore.getState();
  const { vendors, nextVendorId } = useVendorStore.getState();
  const { profile } = useAppStore.getState();

  const data: CloudData = {
    invoices,
    expenses,
    clients,
    vendors,
    profile,
    nextInvId,
    nextExpId,
    nextClientId,
    nextVendorId,
  };

  saveCloudData(uid, data);
}

/**
 * Push a single ledger entry (called when an invoice or expense is added).
 */
export function pushLedgerEntry(uid: string, type: EntryType, data: Invoice | Expense): void {
  addLedgerEntry(uid, type, data).catch(() => {});
}
