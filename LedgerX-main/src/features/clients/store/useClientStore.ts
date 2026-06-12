/**
 * useClientStore – Zustand store for the Clients domain.
 *
 * Responsibilities:
 *   - Persist client list and next-ID counter to localStorage
 *   - Provide `addClient`, `hydrate` (cloud load), and `reset` actions
 *   - Expose `updateClientStats` so the invoice service can keep
 *     billed / outstanding figures in sync after an invoice is created
 */
import { create } from 'zustand';
import { StorageLockedError, storage } from '@/lib/storage';
import { getInitials } from '@/lib/constants';
import type { Client } from '@/lib/types';

const COLORS = [
  '#6366F1','#EC4899','#10B981','#F97316',
  '#8B5CF6','#14B8A6','#F59E0B','#3B82F6',
];

interface ClientStoreState {
  clients:       Client[];
  nextClientId:  number;

  addClient: (
    cli: Omit<Client, 'id' | 'initials' | 'color' | 'billed' | 'outstanding' | 'invoices'>
  ) => Promise<Client>;

  updateClientStats: (
    clientName:    string,
    amount:        number,
    isOutstanding: boolean,
  ) => Promise<void>;

  /** Alias for updateClientStats — treats 'sent' and 'overdue' as outstanding. */
  updateClientBilling: (
    clientName: string,
    amount:     number,
    status:     string,
  ) => Promise<void>;

  hydrate:    (clients: Client[], nextId: number) => Promise<void>;
  /** Alias for hydrate. */
  setClients: (clients: Client[], nextId: number) => Promise<void>;
  reset:      () => Promise<void>;
}

function canPersistEncryptedData(): boolean {
  return !storage.isEncryptionSetup() || storage.isUnlocked();
}

export const useClientStore = create<ClientStoreState>((set, get) => ({
  clients:      [],
  nextClientId: 1,

  addClient: async (cli) => {
    if (!canPersistEncryptedData()) return { ...cli, id: 0, initials: '', color: '', billed: 0, outstanding: 0, invoices: 0 } as Client;
    
    try {
      const freshState = get();
      const { nextClientId, clients } = freshState;
      const id = nextClientId;
      const newClient: Client = {
        ...cli,
        id,
        initials:    getInitials(cli.name),
        color:       COLORS[id % COLORS.length],
        billed:      0,
        outstanding: 0,
        invoices:    0,
      };
      const newClients = [...clients, newClient];
      const newId = id + 1;
      
      // Atomically save both keys before updating state
      await storage.save('lx_clients', newClients);
      await storage.save('lx_cli_id', newId);
      
      // Only update state after persistence succeeds
      set({ clients: newClients, nextClientId: newId });
      return newClient;
    } catch (err) {
      console.error('[LedgerX] Failed to add client:', err);
      throw err;
    }
  },

  updateClientStats: async (clientName, amount, isOutstanding) => {
    if (!canPersistEncryptedData()) return;
    
    try {
      const freshState = get();
      const clients = freshState.clients.map(c => {
        if (c.name !== clientName) return c;
        return {
          ...c,
          billed:      c.billed + amount,
          outstanding: isOutstanding ? c.outstanding + amount : c.outstanding,
          invoices:    c.invoices + 1,
        };
      });
      
      // Await persistence before state update
      await storage.save('lx_clients', clients);
      set({ clients });
    } catch (err) {
      console.error('[LedgerX] Failed to update client stats:', err);
      throw err;
    }
  },

  updateClientBilling: async (clientName, amount, status) => {
    const isOutstanding = status === 'sent' || status === 'overdue';
    await get().updateClientStats(clientName, amount, isOutstanding);
  },

  hydrate: async (clients, nextId) => {
    try {
      await storage.save('lx_clients', clients);
      await storage.save('lx_cli_id', nextId);
      set({ clients, nextClientId: nextId });
    } catch (err) {
      console.error('[LedgerX] Failed to hydrate clients:', err);
      throw err;
    }
  },

  setClients: async (clients, nextId) => {
    try {
      await storage.save('lx_clients', clients);
      await storage.save('lx_cli_id', nextId);
      set({ clients, nextClientId: nextId });
    } catch (err) {
      console.error('[LedgerX] Failed to set clients:', err);
      throw err;
    }
  },

  reset: async () => {
    try {
      await storage.save('lx_clients', []);
      await storage.save('lx_cli_id', 1);
      set({ clients: [], nextClientId: 1 });
    } catch (err) {
      console.error('[LedgerX] Failed to reset clients:', err);
      throw err;
    }
  },
}));
