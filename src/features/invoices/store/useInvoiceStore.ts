/**
 * useInvoiceStore – Zustand store for the Invoices domain.
 *
 * Responsibilities:
 *   - Persist invoice list and next-ID counter to localStorage
 *   - Build invoice metadata (number, initials, color) on creation
 *   - Provide `hydrate` for cloud sync and `reset` for data clear
 */
import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { getInitials } from '@/lib/constants';
import type { Invoice, Client } from '@/lib/types';

interface InvoiceStoreState {
  invoices:   Invoice[];
  nextInvId:  number;

  addInvoice: (
    inv:     Omit<Invoice, 'id' | 'number' | 'clientInitials' | 'clientColor'>,
    clients: Client[],
  ) => Invoice;

  hydrate: (invoices: Invoice[], nextId: number) => void;
  reset:   () => void;
}

export const useInvoiceStore = create<InvoiceStoreState>((set, get) => ({
  invoices:  storage.load<Invoice[]>('lx_invoices', []),
  nextInvId: storage.load<number>('lx_inv_id', 1),

  addInvoice: (inv, clients) => {
    const { nextInvId, invoices } = get();
    const id   = nextInvId;
    const cli  = clients.find(c => c.name === inv.clientName);
    const newInv: Invoice = {
      ...inv,
      id,
      number:         `INV-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`,
      clientInitials: cli?.initials ?? getInitials(inv.clientName),
      clientColor:    cli?.color    ?? '#6366F1',
    };
    const newInvoices = [newInv, ...invoices];
    const newId = id + 1;
    set({ invoices: newInvoices, nextInvId: newId });
    storage.save('lx_invoices', newInvoices);
    storage.save('lx_inv_id', newId);
    return newInv;
  },

  hydrate: (invoices, nextId) => {
    set({ invoices, nextInvId: nextId });
    storage.save('lx_invoices', invoices);
    storage.save('lx_inv_id', nextId);
  },

  reset: () => {
    set({ invoices: [], nextInvId: 1 });
    storage.save('lx_invoices', []);
    storage.save('lx_inv_id', 1);
  },
}));
