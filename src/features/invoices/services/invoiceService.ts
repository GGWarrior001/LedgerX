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
import { useAppStore }     from '@/shared/stores/useAppStore';
import { useAuthStore }    from '@/features/auth/store/useAuthStore';
import { addLedgerEntry } from '@/shared/services/firestoreService';
import { pushCloudSnapshot } from '@/shared/services/cloudSnapshot';
import type { Invoice } from '@/lib/types';

export const invoiceService = {
  async addInvoice(
    inv: Omit<Invoice, 'id' | 'number' | 'clientInitials' | 'clientColor'>,
  ): Promise<Invoice> {
    try {
      // 1. Create invoice in store (awaits persistence)
      const newInv = await useInvoiceStore.getState().addInvoice(inv);

      // 2. Update client stats (awaits persistence)
      await useClientStore.getState().updateClientBilling(
        inv.clientName,
        inv.amount,
        inv.status,
      );

      // 3. Rebuild notifications (awaits persistence)
      await useAppStore.getState().rebuildNotifications(useInvoiceStore.getState().invoices);

      // 4. Cloud sync (fire-and-forget)
      const uid = useAuthStore.getState().user?.uid;
      if (uid) {
        addLedgerEntry(uid, 'invoice', newInv).catch(() => {});
        pushCloudSnapshot(uid);
      }

      return newInv;
    } catch (err) {
      console.error('[LedgerX] Failed to add invoice:', err);
      throw err;
    }
  },
};
