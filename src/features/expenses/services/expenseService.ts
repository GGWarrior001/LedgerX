/**
 * expenseService – expense business-logic service.
 */
import { useExpenseStore } from '../store/useExpenseStore';
import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useClientStore }  from '@/features/clients/store/useClientStore';
import { useVendorStore }  from '@/features/vendors/store/useVendorStore';
import { useAppStore }     from '@/shared/stores/useAppStore';
import { useAuthStore }    from '@/features/auth/store/useAuthStore';
import {
  addLedgerEntry,
  saveCloudData,
} from '@/shared/services/firestoreService';
import type { Expense } from '@/lib/types';

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

export const expenseService = {
  addExpense(exp: Omit<Expense, 'id'>): Expense {
    const auth = useAuthStore.getState();
    const ownerId = auth.user?.uid ?? auth.localUser?.id ?? 'local';
    const newExp = useExpenseStore.getState().addExpense({
      ...exp,
      user_id: ownerId,
    });

    const uid = auth.user?.uid;
    if (uid) {
      addLedgerEntry(uid, 'expense', newExp).catch(() => {});
      pushCloudSnapshot(uid);
    }

    return newExp;
  },
};
