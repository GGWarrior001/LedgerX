import { useState } from 'react';
import { useClientStore }  from '@/features/clients/store/useClientStore';
import { invoiceService }  from '../services/invoiceService';
import ClientModal from '@/features/clients/components/ClientModal';

interface Props { onClose: () => void; }

export default function InvoiceModal({ onClose }: Props) {
  const clients = useClientStore(s => s.clients);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clientName, setClientName] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const due   = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd         = new FormData(e.currentTarget);
    const selectedClient = clients.find(client => client.name === clientName);
    const amount     = parseFloat(fd.get('amount') as string);
    const errs: Record<string, string> = {};
    if (!selectedClient)      errs.clientName = 'Please select a client before creating the invoice.';
    if (!amount || amount <= 0) errs.amount   = 'Amount must be greater than zero.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    invoiceService.addInvoice({
      clientName: selectedClient.name,
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
            <label htmlFor="invoice-client">Client</label>
            <select id="invoice-client" name="clientName" value={clientName} onChange={e => setClientName(e.target.value)} required>
              {clients.length === 0 && <option value="">No clients yet</option>}
              {clients.length > 0 && !clientName && <option value="">Select a client</option>}
              {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {errors.clientName && <span className="text-[11px] text-destructive">{errors.clientName}</span>}
            {clients.length === 0 && (
              <button
                type="button"
                onClick={() => setShowClientModal(true)}
                className="self-start text-[11px] text-primary font-medium hover:underline cursor-pointer"
              >
                Create client
              </button>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="invoice-description">Description</label>
            <input id="invoice-description" type="text" name="description" placeholder="e.g. Web Design Project" required />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="form-field">
              <label htmlFor="invoice-issue-date">Issue Date</label>
              <input id="invoice-issue-date" type="date" name="issueDate" defaultValue={today} required />
            </div>
            <div className="form-field">
              <label htmlFor="invoice-due-date">Due Date</label>
              <input id="invoice-due-date" type="date" name="dueDate" defaultValue={due} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`form-field ${errors.amount ? 'error' : ''}`}>
              <label htmlFor="invoice-amount">Amount</label>
              <input id="invoice-amount" type="number" name="amount" min="1" placeholder="50000" required />
              {errors.amount && <span className="text-[11px] text-destructive">{errors.amount}</span>}
            </div>
            <div className="form-field">
              <label htmlFor="invoice-status">Status</label>
              <select id="invoice-status" name="status">
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
      {showClientModal && (
        <ClientModal
          onClose={() => setShowClientModal(false)}
          onCreated={name => {
            setClientName(name);
            setShowClientModal(false);
          }}
        />
      )}
    </div>
  );
}
