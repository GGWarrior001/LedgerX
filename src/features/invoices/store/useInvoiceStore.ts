/**
 * Invoice store — manages invoice CRUD and persistence.
 */
import { create } from 'zustand';
import type { Invoice } from '@/shared/types';
import { storage } from '@/shared/services/storageService';
import { getInitials } from '@/shared/utils/format';
import { useClientStore } from '@/features/clients/store/useClientStore';

interface InvoiceState {
  invoices: Invoice[];
  nextInvId: number;
}

interface InvoiceActions {
  hydrate: () => void;
  addInvoice: (inv: Omit<Invoice, 'id' | 'number' | 'clientInitials' | 'clientColor'>) => Invoice;
  setInvoices: (invoices: Invoice[], nextId?: number) => void;
  reset: () => void;
  persist: () => void;
}

export const useInvoiceStore = create<InvoiceState & InvoiceActions>()((set, get) => ({
  invoices: [],
  nextInvId: 1,

  hydrate: () => {
    set({
      invoices: storage.load<Invoice[]>('lx_invoices', []),
      nextInvId: storage.load('lx_inv_id', 1),
    });
  },

  addInvoice: (inv) => {
    const { nextInvId: id, invoices } = get();
    const clients = useClientStore.getState().clients;
    const cli = clients.find(c => c.name === inv.clientName);

    const newInv: Invoice = {
      ...inv,
      id,
      number: `INV-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`,
      clientInitials: cli?.initials || getInitials(inv.clientName),
      clientColor: cli?.color || '#6366F1',
    };

    set({ invoices: [newInv, ...invoices], nextInvId: id + 1 });

    // Update client billing stats
    useClientStore.getState().updateClientBilling(inv.clientName, inv.amount, inv.status);

    get().persist();
    return newInv;
  },

  setInvoices: (invoices, nextId) => {
    set(s => ({
      invoices,
      nextInvId: nextId ?? s.nextInvId,
    }));
    get().persist();
  },

  reset: () => {
    set({ invoices: [], nextInvId: 1 });
    get().persist();
  },

  persist: () => {
    const { invoices, nextInvId } = get();
    storage.save('lx_invoices', invoices);
    storage.save('lx_inv_id', nextInvId);
  },
}));
