import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { fmt } from '@/lib/constants';
import ClientModal from '@/components/modals/ClientModal';

export default function ClientsView() {
  const { clients, invoices, cs, privacyMode } = useApp();
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-xl font-bold tracking-tight">Clients & Vendors</div>
          <div className="text-[13px] text-muted-foreground mt-0.5">Manage contacts and relationships</div>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z"/></svg>
          Add Contact
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">No clients yet. Click "Add Contact" to add your first client.</div>
      ) : (
        <div className="grid grid-cols-3 gap-3.5">
          {clients.map(c => {
            const hasOverdue = invoices.some(i => i.clientName === c.name && i.status === 'overdue');
            const statusClass = c.outstanding > 0 ? (hasOverdue ? 'badge-overdue' : 'badge-pending') : 'badge-paid';
            const statusLabel = c.outstanding > 0 ? (hasOverdue ? 'Overdue' : 'Pending') : 'Active';
            return (
              <div key={c.id} className="bg-card border border-border rounded-xl p-4 cursor-pointer transition-all hover:border-primary">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0" style={{ background: c.color, color: '#fff' }}>{c.initials}</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[13.5px]">{c.name}</div>
                    <div className="text-[11.5px] text-muted-foreground">Client · {c.city}</div>
                  </div>
                  <span className={`badge-status ${statusClass} ml-auto`}>{statusLabel}</span>
                </div>
                <div className="flex justify-between py-2.5 border-t border-b border-border mb-2.5">
                  <div className="text-center"><div className="text-[10.5px] text-muted-foreground">Billed</div><div className="text-sm font-bold mt-0.5 tabular-nums">{privacyMode ? '***' : `${cs}${fmt(c.billed)}`}</div></div>
                  <div className="text-center"><div className="text-[10.5px] text-muted-foreground">Outstanding</div><div className={`text-sm font-bold mt-0.5 tabular-nums ${c.outstanding > 0 ? 'text-warning' : 'text-success'}`}>{privacyMode ? '***' : `${cs}${fmt(c.outstanding)}`}</div></div>
                  <div className="text-center"><div className="text-[10.5px] text-muted-foreground">Invoices</div><div className="text-sm font-bold mt-0.5">{c.invoices}</div></div>
                </div>
                <div className="text-[11.5px] text-muted-foreground">{c.email} · {c.phone || '—'}</div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <ClientModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
