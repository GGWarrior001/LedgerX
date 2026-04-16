/**
 * clientService – client business-logic service.
 *
 * Wraps the `useClientStore` mutation and handles any cross-cutting
 * concerns (e.g., cloud persistence) so that UI components stay thin.
 */
import { useClientStore } from '../store/useClientStore';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { saveCloudData } from '@/shared/services/firestoreService';
import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useVendorStore } from '@/features/vendors/store/useVendorStore';
import { useAppStore } from '@/shared/stores/useAppStore';
import type { Client } from '@/lib/types';

/** Snapshot all domain data to Firestore (fire-and-forget). */
function pushCloudSnapshot(uid: string): void {
  const { invoices, nextInvId }       = useInvoiceStore.getState();
  const { expenses, nextExpId }       = useExpenseStore.getState();
  const { clients, nextClientId }     = useClientStore.getState();
  const { vendors, nextVendorId }     = useVendorStore.getState();
  const { profile }                   = useAppStore.getState();
  saveCloudData(uid, {
    invoices, expenses, clients, vendors, profile,
    nextInvId, nextExpId, nextClientId, nextVendorId,
  }).catch(() => { /* silently continue when offline */ });
}

export const clientService = {
  addClient(
    cli: Omit<Client, 'id' | 'initials' | 'color' | 'billed' | 'outstanding' | 'invoices'>,
  ): Client {
    const newClient = useClientStore.getState().addClient(cli);

    const uid = useAuthStore.getState().user?.uid;
    if (uid) pushCloudSnapshot(uid);

    return newClient;
  },
};
