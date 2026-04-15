/**
 * Expense store — manages expense CRUD and persistence.
 */
import { create } from 'zustand';
import type { Expense } from '@/shared/types';
import { storage } from '@/shared/services/storageService';

interface ExpenseState {
  expenses: Expense[];
  nextExpId: number;
}

interface ExpenseActions {
  hydrate: () => void;
  addExpense: (exp: Omit<Expense, 'id'>) => Expense;
  setExpenses: (expenses: Expense[], nextId?: number) => void;
  reset: () => void;
  persist: () => void;
}

export const useExpenseStore = create<ExpenseState & ExpenseActions>()((set, get) => ({
  expenses: [],
  nextExpId: 1,

  hydrate: () => {
    set({
      expenses: storage.load<Expense[]>('lx_expenses', []),
      nextExpId: storage.load('lx_exp_id', 1),
    });
  },

  addExpense: (exp) => {
    const { nextExpId: id, expenses } = get();
    const newExp: Expense = { ...exp, id };

    set({ expenses: [newExp, ...expenses], nextExpId: id + 1 });
    get().persist();
    return newExp;
  },

  setExpenses: (expenses, nextId) => {
    set(s => ({
      expenses,
      nextExpId: nextId ?? s.nextExpId,
    }));
    get().persist();
  },

  reset: () => {
    set({ expenses: [], nextExpId: 1 });
    get().persist();
  },

  persist: () => {
    const { expenses, nextExpId } = get();
    storage.save('lx_expenses', expenses);
    storage.save('lx_exp_id', nextExpId);
  },
}));
