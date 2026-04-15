import { describe, it, expect, beforeEach } from 'vitest';
import { useClientStore } from '@/features/clients/store/useClientStore';

describe('useClientStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useClientStore.setState({
      clients: [],
      nextClientId: 1,
    });
    localStorage.clear();
  });

  it('starts with empty clients array', () => {
    expect(useClientStore.getState().clients).toEqual([]);
  });

  it('adds a client with auto-generated fields', () => {
    const client = useClientStore.getState().addClient({
      name: 'TechMate Solutions',
      city: 'Bangalore',
      email: 'contact@techmate.io',
      phone: '+91 98765 43210',
    });

    expect(client.id).toBe(1);
    expect(client.initials).toBe('TS');
    expect(client.billed).toBe(0);
    expect(client.outstanding).toBe(0);
    expect(client.invoices).toBe(0);
    expect(client.color).toBeTruthy();

    const { clients, nextClientId } = useClientStore.getState();
    expect(clients).toHaveLength(1);
    expect(nextClientId).toBe(2);
  });

  it('increments nextClientId', () => {
    useClientStore.getState().addClient({ name: 'A', city: 'B', email: 'a@b.com', phone: '' });
    useClientStore.getState().addClient({ name: 'C', city: 'D', email: 'c@d.com', phone: '' });
    expect(useClientStore.getState().nextClientId).toBe(3);
    expect(useClientStore.getState().clients).toHaveLength(2);
  });

  it('resets to empty state', () => {
    useClientStore.getState().addClient({ name: 'A', city: 'B', email: 'a@b.com', phone: '' });
    useClientStore.getState().reset();
    expect(useClientStore.getState().clients).toEqual([]);
    expect(useClientStore.getState().nextClientId).toBe(1);
  });

  it('updates client billing stats', () => {
    useClientStore.getState().addClient({ name: 'Acme', city: 'NYC', email: 'a@acme.com', phone: '' });
    useClientStore.getState().updateClientBilling('Acme', 5000, 'sent');

    const acme = useClientStore.getState().clients.find(c => c.name === 'Acme');
    expect(acme?.billed).toBe(5000);
    expect(acme?.outstanding).toBe(5000);
    expect(acme?.invoices).toBe(1);
  });

  it('setClients replaces the entire list', () => {
    const newClients = [
      { id: 10, name: 'X', initials: 'X', color: '#000', city: '', email: '', phone: '', billed: 0, outstanding: 0, invoices: 0 },
    ];
    useClientStore.getState().setClients(newClients, 11);
    expect(useClientStore.getState().clients).toEqual(newClients);
    expect(useClientStore.getState().nextClientId).toBe(11);
  });
});
