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
  async addExpense(exp: Omit<Expense, 'id'>): Promise<Expense> {
    try {
      const auth = useAuthStore.getState();
      const ownerId = auth.user?.uid ?? auth.localUser?.id ?? 'local';
      const newExp = await useExpenseStore.getState().addExpense({
        ...exp,
        user_id: ownerId,
      });
      await useVendorStore.getState().updateVendorSpending(exp.vendor, exp.amount);

      const uid = auth.user?.uid;
      if (uid) {
        addLedgerEntry(uid, 'expense', newExp).catch(() => {});
        pushCloudSnapshot(uid);
      }

      return newExp;
    } catch (err) {
      console.error('[LedgerX] Failed to add expense:', err);
      throw err;
    }
  },
};
