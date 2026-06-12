import { describe, it, expect, beforeEach } from 'vitest';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useVendorStore } from '@/features/vendors/store/useVendorStore';
import { expenseService } from '@/features/expenses/services/expenseService';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

describe('useExpenseStore', () => {
  beforeEach(() => {
    useExpenseStore.setState({ expenses: [], nextExpId: 1 });
    useVendorStore.setState({ vendors: [], nextVendorId: 1 });
    useAuthStore.setState({ user: null, localUser: { id: 'local', name: 'Guest', provider: 'local' } });
    localStorage.clear();
  });

  it('starts with empty expenses', () => {
    expect(useExpenseStore.getState().expenses).toEqual([]);
  });

  it('adds an expense', () => {
    const exp = useExpenseStore.getState().addExpense({
      description: 'AWS Hosting',
      category: 'Cloud & Hosting',
      vendor: 'Amazon',
      date: '2025-03-22',
      receipt: 'attached',
      amount: 5000,
    });

    expect(exp.id).toBe(1);
    expect(exp.description).toBe('AWS Hosting');
    expect(useExpenseStore.getState().expenses).toHaveLength(1);
    expect(useExpenseStore.getState().nextExpId).toBe(2);
  });

  it('resets state', () => {
    useExpenseStore.getState().addExpense({
      description: 'test', category: 'test', vendor: 'test', date: '2025-01-01', receipt: 'pending', amount: 100,
    });
    useExpenseStore.getState().reset();
    expect(useExpenseStore.getState().expenses).toEqual([]);
    expect(useExpenseStore.getState().nextExpId).toBe(1);
  });

  it('updates vendor totalSpent through the expense service', () => {
    useVendorStore.getState().addVendor({
      name: 'Amazon',
      city: 'Bangalore',
      email: 'billing@example.com',
      phone: '',
    });

    expenseService.addExpense({
      description: 'AWS Hosting',
      category: 'Cloud & Hosting',
      vendor: 'Amazon',
      date: '2025-03-22',
      receipt: 'attached',
      amount: 5000,
    });

    expect(useVendorStore.getState().vendors[0].totalSpent).toBe(5000);
  });
});
