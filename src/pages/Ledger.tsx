import { useApp } from '@/contexts/AppContext';
import { fmt } from '@/lib/constants';

export default function LedgerView() {
  const { invoices, expenses, cs, privacyMode } = useApp();

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.amount, 0);
  const totalExp = expenses.reduce((a, e) => a + e.amount, 0);
  const cashAndBank = Math.max(0, totalPaid - totalExp);
  const ar = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((a, i) => a + i.amount, 0);

  const catTotals: Record<string, number> = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });

  const val = (n: number) => privacyMode ? '***' : `${cs}${fmt(n)}`;

  const accounts = [
    { section: 'ASSETS' },
    { code: '1000', name: 'Cash & Bank', type: 'Asset', debit: cashAndBank, credit: 0 },
    ...(ar > 0 ? [{ code: '1100', name: 'Accounts Receivable', type: 'Asset', debit: ar, credit: 0 }] : []),
    { section: 'LIABILITIES' },
    { code: '2000', name: 'Accounts Payable', type: 'Liability', debit: 0, credit: 0 },
    { section: 'INCOME' },
    { code: '4000', name: 'Service Revenue', type: 'Income', debit: 0, credit: totalPaid },
    { section: 'EXPENSES' },
    ...(Object.entries(catTotals).filter(([, v]) => v > 0).map(([k, v], i) => ({
      code: `5${String(i).padStart(3, '0')}`, name: k, type: 'Expense', debit: v, credit: 0,
    }))),
  ];

  const typeClass = (t: string) => t === 'Asset' ? 'badge-sent' : t === 'Income' ? 'badge-paid' : 'badge-pending';

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-xl font-bold tracking-tight">Chart of Accounts</div>
          <div className="text-[13px] text-muted-foreground mt-0.5">Double-entry bookkeeping · General Ledger</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr><th className="!pl-5">Code</th><th>Account Name</th><th>Type</th><th className="!text-right">Debit</th><th className="!text-right !pr-5">Credit</th></tr>
          </thead>
          <tbody>
            {accounts.map((a, i) => {
              if ('section' in a && a.section) {
                return (
                  <tr key={i} className="bg-background">
                    <td colSpan={5} className="!pl-5 font-bold text-muted-foreground text-[10.5px] tracking-widest">{a.section}</td>
                  </tr>
                );
              }
              const acc = a as { code: string; name: string; type: string; debit: number; credit: number };
              return (
                <tr key={i}>
                  <td className="!pl-5 font-semibold text-primary">{acc.code}</td>
                  <td>{acc.name}</td>
                  <td><span className={`badge-status ${typeClass(acc.type)}`}><span className="w-[5px] h-[5px] rounded-full" style={{ background: 'currentColor' }} />{acc.type}</span></td>
                  <td className={`!text-right ${acc.debit > 0 ? (acc.type === 'Expense' ? 'text-destructive' : 'text-success') : 'text-muted-foreground'} font-semibold`}>
                    {acc.debit > 0 ? val(acc.debit) : '—'}
                  </td>
                  <td className="!text-right !pr-5 text-success font-semibold">{acc.credit > 0 ? val(acc.credit) : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
