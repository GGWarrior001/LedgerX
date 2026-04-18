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
import { storage } from '@/lib/storage';
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
  ) => Client;

  updateClientStats: (
    clientName:    string,
    amount:        number,
    isOutstanding: boolean,
  ) => void;

  /** Alias for updateClientStats — treats 'sent' and 'overdue' as outstanding. */
  updateClientBilling: (
    clientName: string,
    amount:     number,
    status:     string,
  ) => void;

  hydrate:    (clients: Client[], nextId: number) => void;
  /** Alias for hydrate. */
  setClients: (clients: Client[], nextId: number) => void;
  reset:      () => void;
}

export const useClientStore = create<ClientStoreState>((set, get) => ({
  clients:      storage.load<Client[]>('lx_clients', []),
  nextClientId: storage.load<number>('lx_cli_id', 1),

  addClient: (cli) => {
    const { nextClientId, clients } = get();
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
    set({ clients: newClients, nextClientId: newId });
    storage.save('lx_clients', newClients);
    storage.save('lx_cli_id', newId);
    return newClient;
  },

  updateClientStats: (clientName, amount, isOutstanding) => {
    set(s => {
      const clients = s.clients.map(c => {
        if (c.name !== clientName) return c;
        return {
          ...c,
          billed:      c.billed + amount,
          outstanding: isOutstanding ? c.outstanding + amount : c.outstanding,
          invoices:    c.invoices + 1,
        };
      });
      storage.save('lx_clients', clients);
      return { clients };
    });
  },

  updateClientBilling: (clientName, amount, status) => {
    const isOutstanding = status === 'sent' || status === 'overdue';
    get().updateClientStats(clientName, amount, isOutstanding);
  },

  hydrate: (clients, nextId) => {
    set({ clients, nextClientId: nextId });
    storage.save('lx_clients', clients);
    storage.save('lx_cli_id', nextId);
  },

  setClients: (clients, nextId) => {
    set({ clients, nextClientId: nextId });
    storage.save('lx_clients', clients);
    storage.save('lx_cli_id', nextId);
  },

  reset: () => {
    set({ clients: [], nextClientId: 1 });
    storage.save('lx_clients', []);
    storage.save('lx_cli_id', 1);
  },
}));
