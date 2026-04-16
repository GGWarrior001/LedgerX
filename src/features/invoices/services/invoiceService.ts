/**
 * invoiceService – invoice business-logic service.
 *
 * Responsibilities:
 *   1. Creates an invoice via the store (localStorage persistence)
 *   2. Updates the linked client's billed / outstanding stats
 *   3. Appends a ledger entry to Firestore (real-time audit trail)
 *   4. Pushes a full snapshot to Firestore (cloud backup)
 *   5. Triggers notification rebuild in useAppStore
 */
import { useInvoiceStore } from '../store/useInvoiceStore';
import { useClientStore }  from '@/features/clients/store/useClientStore';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useVendorStore }  from '@/features/vendors/store/useVendorStore';
import { useAppStore }     from '@/shared/stores/useAppStore';
import { useAuthStore }    from '@/features/auth/store/useAuthStore';
import {
  addLedgerEntry,
  saveCloudData,
} from '@/shared/services/firestoreService';
import type { Invoice } from '@/lib/types';

function pushCloudSnapshot(uid: string): void {
  const { invoices, nextInvId }   = useInvoiceStore.getState();
  const { expenses, nextExpId }   = useExpenseStore.getState();
  const { clients, nextClientId } = useClientStore.getState();
  const { vendors, nextVendorId } = useVendorStore.getState();
  const { profile }               = useAppStore.getState();
  saveCloudData(uid, {
    invoices, expenses, clients, vendors, profile,
    nextInvId, nextExpId, nextClientId, nextVendorId,
  }).catch(() => {});
}

export const invoiceService = {
  addInvoice(
    inv: Omit<Invoice, 'id' | 'number' | 'clientInitials' | 'clientColor'>,
  ): Invoice {
    // 1. Create invoice in store
    const clients = useClientStore.getState().clients;
    const newInv  = useInvoiceStore.getState().addInvoice(inv, clients);

    // 2. Update client stats
    useClientStore.getState().updateClientStats(
      inv.clientName,
      inv.amount,
      inv.status === 'sent',
    );

    // 3. Rebuild notifications
    useAppStore.getState().rebuildNotifications(useInvoiceStore.getState().invoices);

    // 4. Cloud sync (fire-and-forget)
    const uid = useAuthStore.getState().user?.uid;
    if (uid) {
      addLedgerEntry(uid, 'invoice', newInv).catch(() => {});
      pushCloudSnapshot(uid);
    }

    return newInv;
  },
};
