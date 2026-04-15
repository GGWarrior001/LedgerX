import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useAppStore } from '@/shared/stores/useAppStore';
import { fmt, fmtDate, getGreeting } from '@/shared/utils/format';
import { EXPENSE_CATEGORIES } from '@/shared/utils/constants';
import type { ViewId } from '@/shared/types';

interface Props {
  onNavigate: (view: ViewId) => void;
}

export default function DashboardPage({ onNavigate }: Props) {
  const invoices = useInvoiceStore(s => s.invoices);
  const expenses = useExpenseStore(s => s.expenses);
  const cs = useAppStore(s => s.cs());
  const profile = useAppStore(s => s.profile);
  const privacyMode = useAppStore(s => s.privacyMode);

  const rev = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.amount, 0);
  const exp = expenses.reduce((a, e) => a + e.amount, 0);
  const profit = rev - exp;
  const outstanding = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((a, i) => a + i.amount, 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const scPaid = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.amount, 0);
  const scSent = invoices.filter(i => i.status === 'sent').reduce((a, i) => a + i.amount, 0);
  const scDraft = invoices.filter(i => i.status === 'draft').reduce((a, i) => a + i.amount, 0);
  const scOverdue = invoices.filter(i => i.status === 'overdue').reduce((a, i) => a + i.amount, 0);

  const val = (n: number) => privacyMode ? '***' : `${cs}${fmt(n)}`;
  const signedVal = (n: number) => privacyMode ? '***' : `${n < 0 ? '-' : ''}${cs}${fmt(Math.abs(n))}`;

  const firstName = profile?.name?.split(' ')[0] || '';
  const greeting = getGreeting(firstName);

  // Recent transactions
  const txns = [
    ...invoices.map(i => ({ ...i, _type: 'invoice' as const, _date: new Date(i.issueDate || 0) })),
    ...expenses.map(e => ({ ...e, _type: 'expense' as const, _date: new Date(e.date || 0) })),
  ].sort((a, b) => b._date.getTime() - a._date.getTime()).slice(0, 6);

  // Top expenses
  const topExp = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const maxExp = topExp[0]?.amount || 1;
  const catEmojis: Record<string, string> = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.name, c.emoji]));

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 gap-3">
        <div>
          <div className="text-lg md:text-xl font-bold tracking-tight">{greeting}</div>
          <div className="text-[13px] text-muted-foreground mt-0.5">Financial overview · {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-background border border-border cursor-pointer hover:bg-muted transition-colors">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 01.5.5v2.5a1 1 0 001 1h12a1 1 0 001-1v-2.5a.5.5 0 011 0v2.5a2 2 0 01-2 2H2a2 2 0 01-2-2v-2.5a.5.5 0 01.5-.5z"/><path d="M7.646 11.854a.5.5 0 00.708 0l3-3a.5.5 0 00-.708-.708L8.5 10.293V1.5a.5.5 0 00-1 0v8.793L5.354 8.146a.5.5 0 10-.708.708l3 3z"/></svg>
            Export
          </button>
          <button onClick={() => onNavigate('invoices')} className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z"/></svg>
            New Invoice
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-3.5 mb-5">
        <div className="stat-card">
          <div className="text-[11.5px] text-muted-foreground font-medium tracking-wide mb-2 flex items-center justify-between">
            Total Revenue
            <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center" style={{ background: 'rgba(5,150,105,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 16 16"><path d="M8 2v12M4 6l4-4 4 4" stroke="#059669" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums mb-1.5">{val(rev)}</div>
        </div>
        <div className="stat-card">
          <div className="text-[11.5px] text-muted-foreground font-medium tracking-wide mb-2 flex items-center justify-between">
            Total Expenses
            <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 16 16"><path d="M8 2v12M4 10l4 4 4-4" stroke="#EF4444" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums mb-1.5">{val(exp)}</div>
        </div>
        <div className="stat-card">
          <div className="text-[11.5px] text-muted-foreground font-medium tracking-wide mb-2 flex items-center justify-between">
            Net Profit
            <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#6366F1" strokeWidth="1.5"/><path d="M8 5v6M6 7l2-2 2 2" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums mb-1.5">{signedVal(profit)}</div>
        </div>
        <div className="stat-card">
          <div className="text-[11.5px] text-muted-foreground font-medium tracking-wide mb-2 flex items-center justify-between">
            Outstanding
            <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#F59E0B" strokeWidth="1.5"/><path d="M8 5v4M8 10.5v.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums mb-1.5">{val(outstanding)}</div>
          <div className="text-[11.5px] font-medium text-destructive flex items-center gap-1">
            <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><path d="M5 9L1 4h8z"/></svg>
            {overdueCount} invoice{overdueCount !== 1 ? 's' : ''} overdue
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-3.5 mb-5">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold">Revenue vs Expenses</div>
              <div className="text-xs text-muted-foreground mt-0.5">6-month overview</div>
            </div>
          </div>
          <div className="flex gap-4 mb-3.5">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#6366F1' }} />Revenue</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#FDA4AF' }} />Expenses</span>
          </div>
          <div className="h-[180px] flex items-end gap-2">
            {Array.from({ length: 6 }).map((_, i) => {
              const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i));
              const mo = d.getMonth(); const yr = d.getFullYear();
              const r = invoices.filter(inv => inv.status === 'paid' && new Date(inv.issueDate).getMonth() === mo && new Date(inv.issueDate).getFullYear() === yr).reduce((a, inv) => a + inv.amount, 0);
              const e = expenses.filter(ex => new Date(ex.date).getMonth() === mo && new Date(ex.date).getFullYear() === yr).reduce((a, ex) => a + ex.amount, 0);
              const scale = 160 / Math.max(...Array.from({ length: 6 }).map((_, j) => {
                const dd = new Date(); dd.setDate(1); dd.setMonth(dd.getMonth() - (5 - j));
                const mm = dd.getMonth(); const yy = dd.getFullYear();
                return Math.max(
                  invoices.filter(inv => inv.status === 'paid' && new Date(inv.issueDate).getMonth() === mm && new Date(inv.issueDate).getFullYear() === yy).reduce((a, inv) => a + inv.amount, 0),
                  expenses.filter(ex => new Date(ex.date).getMonth() === mm && new Date(ex.date).getFullYear() === yy).reduce((a, ex) => a + ex.amount, 0),
                  1
                );
              }));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex gap-0.5 items-end w-full justify-center" style={{ height: 160 }}>
                    <div className="w-[22px] rounded-t-md transition-all" style={{ height: Math.max(r * scale, 2), background: '#6366F1' }} />
                    <div className="w-[22px] rounded-t-md transition-all" style={{ height: Math.max(e * scale, 2), background: '#FDA4AF' }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm font-semibold mb-1">Invoice Status</div>
          <div className="text-xs text-muted-foreground mb-4">Current period</div>
          <div className="flex flex-col gap-2.5">
            {[
              { label: 'Paid', color: '#059669', amount: scPaid },
              { label: 'Sent', color: '#3B82F6', amount: scSent },
              { label: 'Draft', color: '#9CA3AF', amount: scDraft },
              { label: 'Overdue', color: '#EF4444', amount: scOverdue },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: s.color }} />{s.label}
                </span>
                <span className="text-[13px] font-bold tabular-nums">{val(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-3.5">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[18px] pt-[18px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13.5px] font-semibold">Recent Transactions</span>
            </div>
          </div>
          <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="!pl-[18px]">Client / Vendor</th><th>Type</th><th>Date</th><th>Status</th><th className="!text-right !pr-[18px]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No transactions yet</td></tr>
              ) : txns.map((t, i) => {
                const isInv = t._type === 'invoice';
                const name = isInv ? (t as any).clientName : ((t as any).vendor || (t as any).description);
                const ini = isInv ? (t as any).clientInitials : name?.split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('');
                const col = isInv ? ((t as any).clientColor || '#6366F1') : '#F59E0B';
                const status = isInv ? (t as any).status : 'paid';
                const badgeClass = `badge-${status}`;
                return (
                  <tr key={i}>
                    <td className="!pl-[18px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-semibold shrink-0" style={{ background: col, color: '#fff' }}>{ini}</div>
                        <div>
                          <div className="font-medium text-[13px]">{name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground text-xs">{isInv ? 'Invoice' : 'Expense'}</td>
                    <td className="text-muted-foreground text-xs">{fmtDate(isInv ? (t as any).issueDate : (t as any).date)}</td>
                    <td><span className={`badge-status ${badgeClass}`}><span className="w-[5px] h-[5px] rounded-full" style={{ background: 'currentColor' }} />{status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                    <td className={`!text-right !pr-[18px] font-semibold tabular-nums ${isInv && status === 'paid' ? 'text-success' : !isInv || status === 'overdue' ? 'text-destructive' : ''}`}>
                      {privacyMode ? '***' : `${isInv ? (status === 'paid' ? '+' : status === 'overdue' ? '−' : '') : '−'}${cs}${fmt(t.amount)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[18px] pt-[18px]">
            <div className="text-[13.5px] font-semibold mb-1">Top Expenses</div>
            <div className="text-[11.5px] text-muted-foreground mb-3">This month</div>
          </div>
          {topExp.length === 0 ? (
            <div className="px-5 py-5 text-center text-muted-foreground text-[12.5px]">No expenses recorded yet</div>
          ) : (
            topExp.map((e, i) => {
              const pct = Math.round((e.amount / maxExp) * 100);
              const emoji = catEmojis[e.category] || '💼';
              const label = e.description.length > 26 ? e.description.slice(0, 25) + '…' : e.description;
              return (
                <div key={i} className="flex items-center px-[18px] py-3 gap-3 border-b border-border last:border-0 hover:bg-background transition-colors">
                  <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[15px] shrink-0" style={{ background: 'rgba(99,102,241,0.1)' }}>{emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium">{label}</div>
                    <div className="mt-1.5 h-[3px] bg-border rounded-full overflow-hidden">
                      <div className="h-[3px] bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">{e.category}</div>
                  </div>
                  <div className="text-[13.5px] font-bold tabular-nums text-destructive ml-2.5 whitespace-nowrap">{privacyMode ? '***' : `−${cs}${fmt(e.amount)}`}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
