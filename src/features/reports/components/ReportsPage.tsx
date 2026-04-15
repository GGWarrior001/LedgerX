import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useAppStore } from '@/shared/stores/useAppStore';
import { fmt, currentFY } from '@/shared/utils/format';

export default function ReportsPage() {
  const invoices = useInvoiceStore(s => s.invoices);
  const expenses = useExpenseStore(s => s.expenses);
  const cs = useAppStore(s => s.cs());
  const profile = useAppStore(s => s.profile);
  const privacyMode = useAppStore(s => s.privacyMode);

  const fyPref = profile?.fiscalYear || 'Apr-Mar';
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.amount, 0);
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? Math.round(netProfit / totalRevenue * 1000) / 10 : 0;
  const outstanding = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((a, i) => a + i.amount, 0);
  const totalAssets = Math.max(0, netProfit) + outstanding;

  const val = (n: number) => privacyMode ? '***' : `${cs}${fmt(Math.abs(n))}`;

  function getQ(dateStr: string) {
    const m = new Date(dateStr).getMonth();
    const offsets: Record<string, number> = { 'Apr-Mar': 3, 'Jul-Jun': 6, 'Oct-Sep': 9, 'Jan-Dec': 0 };
    const off = offsets[fyPref] || 0;
    return Math.floor(((m - off + 12) % 12) / 3);
  }

  const qRev = [0, 0, 0, 0], qExp = [0, 0, 0, 0];
  invoices.filter(i => i.status === 'paid').forEach(i => { qRev[getQ(i.issueDate)] += i.amount; });
  expenses.forEach(e => { qExp[getQ(e.date)] += e.amount; });
  const qProfit = qRev.map((r, i) => r - qExp[i]);

  const exportCSV = () => {
    const rows = [['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Status', 'Amount']];
    invoices.forEach(i => rows.push([i.number, i.clientName, i.issueDate, i.dueDate, i.status, String(i.amount)]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'ledgerx-invoices.csv'; a.click();
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-xl font-bold tracking-tight">Financial Reports</div>
          <div className="text-[13px] text-muted-foreground mt-0.5">FY {currentFY(fyPref)}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-background border border-border cursor-pointer hover:bg-muted transition-colors">Download CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3.5 mb-5">
        <div className="bg-card border border-border rounded-xl p-5" style={{ borderTop: '3px solid hsl(var(--primary))' }}>
          <div className="text-[11.5px] text-muted-foreground font-medium mb-1.5">Profit & Loss</div>
          <div className="text-[22px] font-bold tracking-tight tabular-nums mb-0.5">{netProfit < 0 ? '−' : ''}{val(netProfit)}</div>
          <div className={`text-xs font-medium ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{netProfit >= 0 ? 'Net Profit' : 'Net Loss'} · {Math.abs(margin)}% margin</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5" style={{ borderTop: '3px solid hsl(var(--success))' }}>
          <div className="text-[11.5px] text-muted-foreground font-medium mb-1.5">Balance Sheet</div>
          <div className="text-[22px] font-bold tracking-tight tabular-nums mb-0.5">{val(totalAssets)}</div>
          <div className="text-xs font-medium text-success">Total Assets · {totalAssets > 0 ? 'Healthy' : 'Review'}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5" style={{ borderTop: '3px solid hsl(var(--warning))' }}>
          <div className="text-[11.5px] text-muted-foreground font-medium mb-1.5">Cash Flow</div>
          <div className="text-[22px] font-bold tracking-tight tabular-nums mb-0.5">{val(totalRevenue)}</div>
          <div className="text-xs font-medium text-warning">Operating Cash Flow</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-sm font-semibold mb-4">Profit & Loss Statement — FY {currentFY(fyPref)}</div>
        <table className="data-table">
          <thead>
            <tr><th>Account</th><th className="!text-right">Q1</th><th className="!text-right">Q2</th><th className="!text-right">Q3</th><th className="!text-right">Q4</th><th className="!text-right">Full Year</th></tr>
          </thead>
          <tbody>
            <tr className="font-semibold">
              <td>Total Revenue</td>
              {qRev.map((v, i) => <td key={i} className="!text-right text-success">{privacyMode ? '***' : `${cs}${fmt(v)}`}</td>)}
              <td className="!text-right text-success">{privacyMode ? '***' : `${cs}${fmt(totalRevenue)}`}</td>
            </tr>
            <tr className="font-semibold">
              <td>Total Expenses</td>
              {qExp.map((v, i) => <td key={i} className="!text-right text-destructive">{privacyMode ? '***' : `${cs}${fmt(v)}`}</td>)}
              <td className="!text-right text-destructive">{privacyMode ? '***' : `${cs}${fmt(totalExpenses)}`}</td>
            </tr>
            <tr className="font-bold bg-primary/5">
              <td className="!border-t-2 !border-border">Net Profit</td>
              {qProfit.map((v, i) => <td key={i} className={`!text-right !border-t-2 !border-border ${v < 0 ? 'text-destructive' : 'text-success'}`}>{privacyMode ? '***' : `${v < 0 ? '−' : ''}${cs}${fmt(Math.abs(v))}`}</td>)}
              <td className={`!text-right !border-t-2 !border-border ${netProfit < 0 ? 'text-destructive' : 'text-success'}`}>{privacyMode ? '***' : `${netProfit < 0 ? '−' : ''}${cs}${fmt(Math.abs(netProfit))}`}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
