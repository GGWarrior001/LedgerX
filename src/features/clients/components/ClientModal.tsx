import { useState } from 'react';
import { clientService } from '../services/clientService';
import { useClientStore } from '../store/useClientStore';

interface Props {
  onClose: () => void;
  onCreated?: (name: string) => void;
}

export default function ClientModal({ onClose, onCreated }: Props) {
  const clients = useClientStore(s => s.clients);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string).trim();
    if (clients.some(client => client.name.trim().toLowerCase() === name.toLowerCase())) {
      setError('A client with this name already exists.');
      return;
    }
    try {
      await clientService.addClient({
      name,
      city:  fd.get('city')  as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      });
      onCreated?.(name);
      onClose();
    } catch (err) {
      console.error('[LedgerX] Failed to create client:', err);
      setError('Unable to create client. Please try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-[440px]">
        <div className="flex items-center justify-between px-5 py-[18px] border-b border-border font-semibold text-sm">
          <span>Add Client</span>
          <button onClick={onClose} className="icon-btn !w-[26px] !h-[26px] !border-none cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5">
          <div className="form-field">
            <label htmlFor="client-name">Company Name</label>
            <input id="client-name" type="text" name="name" placeholder="e.g. Acme Corp" required />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="form-field">
              <label htmlFor="client-city">City</label>
              <input id="client-city" type="text" name="city" placeholder="e.g. Bangalore" required />
            </div>
            <div className="form-field">
              <label htmlFor="client-email">Email</label>
              <input id="client-email" type="email" name="email" placeholder="contact@company.com" required />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="client-phone">Phone</label>
            <input id="client-phone" type="tel" name="phone" placeholder="+91 98765 43210" />
          </div>
          {error && <p className="text-[11px] text-destructive mb-2" role="alert">{error}</p>}
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
              Add Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
