import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { fmt, fmtDate, EXPENSE_CATEGORIES } from '@/lib/constants';
import ExpenseModal from '@/components/modals/ExpenseModal';

export default function ExpensesView() {
  const { expenses, cs, privacyMode } = useApp();
  const [showModal, setShowModal] = useState(false);

  const catTotals: Record<string, number> = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-xl font-bold tracking-tight">Expenses</div>
          <div className="text-[13px] text-muted-foreground mt-0.5">All business expenses, categorised</div>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z"/></svg>
          Record Expense
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {EXPENSE_CATEGORIES.map(cat => (
          <div key={cat.name} className="bg-card border border-border rounded-xl p-3.5 text-center cursor-pointer transition-all hover:border-primary hover:-translate-y-px">
            <div className="text-xl mb-1.5">{cat.emoji}</div>
            <div className="text-[11.5px] font-medium text-muted-foreground">{cat.name}</div>
            <div className="text-[15px] font-bold tracking-tight mt-0.5 tabular-nums text-destructive">
              {privacyMode ? '***' : `${cs}${fmt(catTotals[cat.name] || 0)}`}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 pt-[18px]"><div className="text-[13.5px] font-semibold">All Expenses</div></div>
        <table className="data-table mt-3">
          <thead>
            <tr><th className="!pl-5">Description</th><th>Category</th><th>Vendor</th><th>Date</th><th>Receipt</th><th className="!text-right !pr-5">Amount</th></tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No expenses recorded yet. Click "Record Expense" to add one.</td></tr>
            ) : expenses.map(e => (
              <tr key={e.id}>
                <td className="!pl-5 font-medium">{e.description}</td>
                <td><span className="badge-status" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>{e.category}</span></td>
                <td className="text-muted-foreground">{e.vendor}</td>
                <td className="text-muted-foreground">{fmtDate(e.date)}</td>
                <td className={`text-xs font-medium ${e.receipt === 'attached' ? 'text-success' : 'text-warning'}`}>{e.receipt === 'attached' ? '✓ Attached' : '⚠ Pending'}</td>
                <td className="!text-right !pr-5 font-semibold tabular-nums text-destructive">{privacyMode ? '***' : `−${cs}${fmt(e.amount)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <ExpenseModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
