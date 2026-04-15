/**
 * Expense service — orchestrates expense operations between
 * the store and cloud sync.
 */
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import type { Expense } from '@/shared/types';

export type AddExpenseInput = Omit<Expense, 'id'>;

export function addExpense(
  input: AddExpenseInput,
  callbacks?: { onCloudSync?: () => void; onPushEntry?: (exp: Expense) => void },
): Expense {
  const expense = useExpenseStore.getState().addExpense(input);
  callbacks?.onCloudSync?.();
  callbacks?.onPushEntry?.(expense);
  return expense;
}
