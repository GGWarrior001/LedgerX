import { useState } from 'react';
import { useClientStore }  from '@/features/clients/store/useClientStore';
import { invoiceService }  from '../services/invoiceService';

interface Props { onClose: () => void; }

export default function InvoiceModal({ onClose }: Props) {
  const clients = useClientStore(s => s.clients);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const today = new Date().toISOString().split('T')[0];
  const due   = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd         = new FormData(e.currentTarget);
    const clientName = fd.get('clientName') as string;
    const amount     = parseFloat(fd.get('amount') as string);
    const errs: Record<string, string> = {};
    if (!clientName)          errs.clientName = 'Please select a client.';
    if (!amount || amount <= 0) errs.amount   = 'Amount must be greater than zero.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    invoiceService.addInvoice({
      clientName,
      description: fd.get('description') as string,
      issueDate:   fd.get('issueDate')   as string,
      dueDate:     fd.get('dueDate')     as string,
      status:      fd.get('status')      as 'draft' | 'sent',
      amount:      amount,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-[480px]">
        <div className="flex items-center justify-between px-5 py-[18px] border-b border-border font-semibold text-sm">
          <span>New Invoice</span>
          <button onClick={onClose} className="icon-btn !w-[26px] !h-[26px] !border-none cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5">
          <div className={`form-field ${errors.clientName ? 'error' : ''}`}>
            <label>Client</label>
            <select name="clientName" required>
              {clients.length === 0 && <option value="">No clients — add one first</option>}
              {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {errors.clientName && <span className="text-[11px] text-destructive">{errors.clientName}</span>}
          </div>
          <div className="form-field">
            <label>Description</label>
            <input type="text" name="description" placeholder="e.g. Web Design Project" required />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="form-field">
              <label>Issue Date</label>
              <input type="date" name="issueDate" defaultValue={today} required />
            </div>
            <div className="form-field">
              <label>Due Date</label>
              <input type="date" name="dueDate" defaultValue={due} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`form-field ${errors.amount ? 'error' : ''}`}>
              <label>Amount</label>
              <input type="number" name="amount" min="1" placeholder="50000" required />
              {errors.amount && <span className="text-[11px] text-destructive">{errors.amount}</span>}
            </div>
            <div className="form-field">
              <label>Status</label>
              <select name="status">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
              </select>
            </div>
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
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
