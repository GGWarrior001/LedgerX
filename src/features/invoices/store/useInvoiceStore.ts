/**
 * useInvoiceStore – Zustand store for the Invoices domain.
 *
 * Responsibilities:
 *   - Persist invoice list and next-ID counter to localStorage
 *   - Build invoice metadata (number, initials, color) on creation
 *   - Provide `hydrate` for cloud sync and `reset` for data clear
 */
import { create } from 'zustand';
import { StorageLockedError, storage } from '@/lib/storage';
import { getInitials } from '@/lib/constants';
import type { Invoice, Client } from '@/lib/types';
import { useClientStore } from '@/features/clients/store/useClientStore';

interface InvoiceStoreState {
  invoices:   Invoice[];
  nextInvId:  number;

  addInvoice: (
    inv: Omit<Invoice, 'id' | 'number' | 'clientInitials' | 'clientColor'>,
  ) => Promise<Invoice>;

  hydrate: (invoices: Invoice[], nextId: number) => Promise<void>;
  reset:   () => Promise<void>;
}

function canPersistEncryptedData(): boolean {
  return !storage.isEncryptionSetup() || storage.isUnlocked();
}

export const useInvoiceStore = create<InvoiceStoreState>((set, get) => ({
  invoices:  [],
  nextInvId: 1,

  addInvoice: async (inv) => {
    if (!canPersistEncryptedData()) return { ...inv, id: 0, number: '', clientInitials: '', clientColor: '' } as Invoice;
    
    try {
      const freshState = get();
      const { nextInvId, invoices } = freshState;
      const clients = useClientStore.getState().clients;
      
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
      
      // Atomically save both keys before updating state
      await storage.save('lx_invoices', newInvoices);
      await storage.save('lx_inv_id', newId);
      
      // Only update state after persistence succeeds
      set({ invoices: newInvoices, nextInvId: newId });
      return newInv;
    } catch (err) {
      console.error('[LedgerX] Failed to add invoice:', err);
      throw err;
    }
  },

  hydrate: async (invoices, nextId) => {
    try {
      await storage.save('lx_invoices', invoices);
      await storage.save('lx_inv_id', nextId);
      set({ invoices, nextInvId: nextId });
    } catch (err) {
      console.error('[LedgerX] Failed to hydrate invoices:', err);
      throw err;
    }
  },

  reset: async () => {
    try {
      await storage.save('lx_invoices', []);
      await storage.save('lx_inv_id', 1);
      set({ invoices: [], nextInvId: 1 });
    } catch (err) {
      console.error('[LedgerX] Failed to reset invoices:', err);
      throw err;
    }
  },
}));
