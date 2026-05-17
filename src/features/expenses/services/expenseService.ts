/**
 * expenseService – expense business-logic service.
 */
import { useExpenseStore } from '../store/useExpenseStore';
import { useVendorStore }  from '@/features/vendors/store/useVendorStore';
import { useAuthStore }    from '@/features/auth/store/useAuthStore';
import { addLedgerEntry } from '@/shared/services/firestoreService';
import { pushCloudSnapshot } from '@/shared/services/cloudSnapshot';
import type { Expense } from '@/lib/types';

export const expenseService = {
  addExpense(exp: Omit<Expense, 'id'>): Expense {
    const auth = useAuthStore.getState();
    const ownerId = auth.user?.uid ?? auth.localUser?.id ?? 'local';
    const newExp = useExpenseStore.getState().addExpense({
      ...exp,
      user_id: ownerId,
    });
    useVendorStore.getState().updateVendorSpending(exp.vendor, exp.amount);

    const uid = auth.user?.uid;
    if (uid) {
      addLedgerEntry(uid, 'expense', newExp).catch(() => {});
      pushCloudSnapshot(uid);
    }

    return newExp;
  },
};
