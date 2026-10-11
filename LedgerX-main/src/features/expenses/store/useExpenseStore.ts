/**
 * useExpenseStore – Zustand store for the Expenses domain.
 */
import { create } from 'zustand';
import { StorageLockedError, storage } from '@/lib/storage';
import type { Expense } from '@/lib/types';

interface ExpenseStoreState {
  expenses:  Expense[];
  nextExpId: number;

  addExpense: (exp: Omit<Expense, 'id'>) => Promise<Expense>;
  hydrate:    (expenses: Expense[], nextId: number) => void | Promise<void>;
  reset:      () => Promise<void>;
}

function canPersistEncryptedData(): boolean {
  return !storage.isEncryptionSetup() || storage.isUnlocked();
}

export const useExpenseStore = create<ExpenseStoreState>((set, get) => ({
  expenses:  [],
  nextExpId: 1,

  addExpense: async (exp) => {
    if (!canPersistEncryptedData()) return { ...exp, id: 0 } as Expense;
    
    try {
      const freshState = get();
      const { nextExpId, expenses } = freshState;
      const id     = nextExpId;
      const newExp = { ...exp, id };
      const newExpenses = [newExp, ...expenses];
      const newId = id + 1;
      
      // Atomically save both keys before updating state
      await storage.save('lx_expenses', newExpenses);
      await storage.save('lx_exp_id', newId);
      
      // Only update state after persistence succeeds
      set({ expenses: newExpenses, nextExpId: newId });
      return newExp;
    } catch (err) {
      console.error('[LedgerX] Failed to add expense:', err);
      throw err;
    }
  },

  hydrate: (expenses, nextId) => {
    set({ expenses, nextExpId: nextId });
  },

  reset: async () => {
    try {
      await storage.save('lx_expenses', []);
      await storage.save('lx_exp_id', 1);
      set({ expenses: [], nextExpId: 1 });
    } catch (err) {
      console.error('[LedgerX] Failed to reset expenses:', err);
      throw err;
    }
  },
}));
