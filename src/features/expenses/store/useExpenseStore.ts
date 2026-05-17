/**
 * useExpenseStore – Zustand store for the Expenses domain.
 */
import { create } from 'zustand';
import { StorageLockedError, storage } from '@/lib/storage';
import type { Expense } from '@/lib/types';

interface ExpenseStoreState {
  expenses:  Expense[];
  nextExpId: number;

  addExpense: (exp: Omit<Expense, 'id'>) => Expense;
  hydrate:    (expenses: Expense[], nextId: number) => void;
  reset:      () => void;
}

function loadStored<T>(key: string, defaultValue: T): T {
  try {
    return storage.load<T>(key, defaultValue);
  } catch (err) {
    if (err instanceof StorageLockedError) return defaultValue;
    throw err;
  }
}

export const useExpenseStore = create<ExpenseStoreState>((set, get) => ({
  expenses:  loadStored<Expense[]>('lx_expenses', []),
  nextExpId: loadStored<number>('lx_exp_id', 1),

  addExpense: (exp) => {
    const { nextExpId, expenses } = get();
    const id     = nextExpId;
    const newExp = { ...exp, id };
    const newExpenses = [newExp, ...expenses];
    const newId = id + 1;
    set({ expenses: newExpenses, nextExpId: newId });
    storage.save('lx_expenses', newExpenses);
    storage.save('lx_exp_id', newId);
    return newExp;
  },

  hydrate: (expenses, nextId) => {
    set({ expenses, nextExpId: nextId });
    storage.save('lx_expenses', expenses);
    storage.save('lx_exp_id', nextId);
  },

  reset: () => {
    set({ expenses: [], nextExpId: 1 });
    storage.save('lx_expenses', []);
    storage.save('lx_exp_id', 1);
  },
}));
