/**
 * Client store — manages client CRUD and persistence.
 */
import { create } from 'zustand';
import type { Client } from '@/shared/types';
import { storage } from '@/shared/services/storageService';
import { getInitials } from '@/shared/utils/format';
import { CLIENT_COLORS } from '@/shared/utils/constants';

interface ClientState {
  clients: Client[];
  nextClientId: number;
}

interface ClientActions {
  hydrate: () => void;
  addClient: (cli: Omit<Client, 'id' | 'initials' | 'color' | 'billed' | 'outstanding' | 'invoices'>) => Client;
  setClients: (clients: Client[], nextId?: number) => void;
  updateClientBilling: (clientName: string, amount: number, status: string) => void;
  reset: () => void;
  persist: () => void;
}

export const useClientStore = create<ClientState & ClientActions>()((set, get) => ({
  clients: [],
  nextClientId: 1,

  hydrate: () => {
    set({
      clients: storage.load<Client[]>('lx_clients', []),
      nextClientId: storage.load('lx_cli_id', 1),
    });
  },

  addClient: (cli) => {
    const { nextClientId: id, clients } = get();
    const newClient: Client = {
      ...cli,
      id,
      initials: getInitials(cli.name),
      color: CLIENT_COLORS[id % CLIENT_COLORS.length],
      billed: 0,
      outstanding: 0,
      invoices: 0,
    };
    const updated = [...clients, newClient];
    set({ clients: updated, nextClientId: id + 1 });
    get().persist();
    return newClient;
  },

  setClients: (clients, nextId) => {
    set(s => ({
      clients,
      nextClientId: nextId ?? s.nextClientId,
    }));
    get().persist();
  },

  updateClientBilling: (clientName, amount, status) => {
    set(s => ({
      clients: s.clients.map(c => {
        if (c.name === clientName) {
          return {
            ...c,
            billed: c.billed + amount,
            outstanding: status === 'sent' ? c.outstanding + amount : c.outstanding,
            invoices: c.invoices + 1,
          };
        }
        return c;
      }),
    }));
    get().persist();
  },

  reset: () => {
    set({ clients: [], nextClientId: 1 });
    get().persist();
  },

  persist: () => {
    const { clients, nextClientId } = get();
    storage.save('lx_clients', clients);
    storage.save('lx_cli_id', nextClientId);
  },
}));
