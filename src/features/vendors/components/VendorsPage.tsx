import { useState } from 'react';
import { useVendorStore } from '@/features/vendors/store/useVendorStore';
import { useAppStore } from '@/shared/stores/useAppStore';
import { fmt } from '@/shared/utils/format';
import VendorModal from './VendorModal';

export default function VendorsPage() {
  const vendors = useVendorStore(s => s.vendors);
  const cs = useAppStore(s => s.cs());
  const privacyMode = useAppStore(s => s.privacyMode);
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-xl font-bold tracking-tight">Vendors</div>
          <div className="text-[13px] text-muted-foreground mt-0.5">Manage supplier relationships</div>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z"/></svg>
          Add Vendor
        </button>
      </div>

      {vendors.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">No vendors yet. Click "Add Vendor" to add your first vendor.</div>
      ) : (
        <div className="grid grid-cols-3 gap-3.5">
          {vendors.map(v => (
            <div key={v.id} className="bg-card border border-border rounded-xl p-4 cursor-pointer transition-all hover:border-primary">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0" style={{ background: v.color, color: '#fff' }}>{v.initials}</div>
                <div>
                  <div className="font-semibold text-[13.5px]">{v.name}</div>
                  <div className="text-[11.5px] text-muted-foreground">Vendor · {v.city || '—'}</div>
                </div>
                <span className="badge-status badge-sent ml-auto">Active</span>
              </div>
              <div className="flex justify-between py-2.5 border-t border-b border-border mb-2.5">
                <div className="text-center w-full"><div className="text-[10.5px] text-muted-foreground">Total Spent</div><div className="text-sm font-bold mt-0.5 tabular-nums text-destructive">{privacyMode ? '***' : `${cs}${fmt(v.totalSpent)}`}</div></div>
              </div>
              <div className="text-[11.5px] text-muted-foreground">{v.email || '—'} · {v.phone || '—'}</div>
            </div>
          ))}
        </div>
      )}

      {showModal && <VendorModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
