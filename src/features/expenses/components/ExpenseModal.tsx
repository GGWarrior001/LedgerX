import { useState } from 'react';
import { expenseService } from '../services/expenseService';
import { EXPENSE_CATEGORIES } from '@/lib/constants';

interface Props { onClose: () => void; }

export default function ExpenseModal({ onClose }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd          = new FormData(e.currentTarget);
    const description = (fd.get('description') as string).trim();
    const vendor      = (fd.get('vendor')      as string).trim();
    const amount      = parseFloat(fd.get('amount') as string);
    const errs: Record<string, string> = {};
    if (!description)           errs.description = 'Description is required.';
    if (!vendor)                errs.vendor      = 'Vendor name is required.';
    if (!amount || amount <= 0) errs.amount      = 'Amount must be greater than zero.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    expenseService.addExpense({
      description, vendor,
      category: fd.get('category') as string,
      date:     fd.get('date')     as string,
      receipt:  fd.get('receipt')  as 'attached' | 'pending',
      amount:   amount,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-[460px]">
        <div className="flex items-center justify-between px-5 py-[18px] border-b border-border font-semibold text-sm">
          <span>Record Expense</span>
          <button onClick={onClose} className="icon-btn !w-[26px] !h-[26px] !border-none cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5">
          <div className={`form-field ${errors.description ? 'error' : ''}`}>
            <label htmlFor="expense-description">Description</label>
            <input id="expense-description" type="text" name="description" placeholder="e.g. Monthly Server Costs" required />
            {errors.description && <span className="text-[11px] text-destructive">{errors.description}</span>}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="form-field">
              <label htmlFor="expense-category">Category</label>
              <select id="expense-category" name="category">
                {EXPENSE_CATEGORIES.map(c => <option key={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="expense-date">Date</label>
              <input id="expense-date" type="date" name="date" defaultValue={today} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`form-field ${errors.vendor ? 'error' : ''}`}>
              <label htmlFor="expense-vendor">Vendor</label>
              <input id="expense-vendor" type="text" name="vendor" placeholder="e.g. Amazon" required />
              {errors.vendor && <span className="text-[11px] text-destructive">{errors.vendor}</span>}
            </div>
            <div className={`form-field ${errors.amount ? 'error' : ''}`}>
              <label htmlFor="expense-amount">Amount</label>
              <input id="expense-amount" type="number" name="amount" min="1" required />
              {errors.amount && <span className="text-[11px] text-destructive">{errors.amount}</span>}
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="expense-receipt">Receipt</label>
            <select id="expense-receipt" name="receipt">
              <option value="attached">Attached</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-[12.5px] font-medium bg-background border border-border cursor-pointer hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-2 rounded-lg text-[12.5px] font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity"
            >
              Record Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
