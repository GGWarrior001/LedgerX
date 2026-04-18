import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { fmt, fmtDate } from '@/lib/constants';
import InvoiceModal from '@/components/modals/InvoiceModal';
import type { Invoice } from '@/lib/types';

type InvoiceStatusFilter = Invoice['status'] | 'all';
type InvoiceCounts = Record<InvoiceStatusFilter, number>;

export default function InvoicesView() {
  const { invoices, cs, privacyMode } = useApp();
  const [filter, setFilter] = useState<InvoiceStatusFilter>('all');
  const [showModal, setShowModal] = useState(false);

  const list = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);
  const counts: InvoiceCounts = { all: invoices.length, draft: 0, sent: 0, paid: 0, overdue: 0 };
  invoices.forEach(i => { counts[i.status] += 1; });
  const tabs: InvoiceStatusFilter[] = ['all', 'draft', 'sent', 'paid', 'overdue'];

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-xl font-bold tracking-tight">Invoices</div>
          <div className="text-[13px] text-muted-foreground mt-0.5">Track and manage all your invoices</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z"/></svg>
            New Invoice
          </button>
        </div>
      </div>

      <div className="flex gap-0.5 mb-3.5 bg-background p-0.5 rounded-lg w-fit">
        {tabs.map(t => (
          <div
            key={t}
            className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium cursor-pointer transition-all ${filter === t ? 'bg-card font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setFilter(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)} ({counts[t]})
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="!pl-5">Invoice #</th><th>Client</th><th>Issue Date</th><th>Due Date</th><th>Status</th><th className="!text-right !pr-5">Amount</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No invoices found</td></tr>
            ) : list.map(i => (
              <tr key={i.id}>
                <td className="!pl-5 font-semibold text-primary">{i.number}</td>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-semibold shrink-0" style={{ background: i.clientColor, color: '#fff' }}>{i.clientInitials}</div>
                    <span className="font-medium">{i.clientName}</span>
                  </div>
                </td>
                <td className="text-muted-foreground">{fmtDate(i.issueDate)}</td>
                <td className="text-muted-foreground">{fmtDate(i.dueDate)}</td>
                <td><span className={`badge-status badge-${i.status}`}><span className="w-[5px] h-[5px] rounded-full" style={{ background: 'currentColor' }} />{i.status.charAt(0).toUpperCase() + i.status.slice(1)}</span></td>
                <td className={`!text-right !pr-5 font-semibold tabular-nums ${i.status === 'paid' ? 'text-success' : i.status === 'overdue' ? 'text-destructive' : ''}`}>
                  {privacyMode ? '***' : `${i.status === 'paid' ? '+' : i.status === 'overdue' ? '−' : ''}${cs}${fmt(i.amount)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <InvoiceModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
