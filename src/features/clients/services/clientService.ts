/**
 * Client service — orchestrates client operations between
 * the store and cloud sync.
 */
import { useClientStore } from '@/features/clients/store/useClientStore';
import type { Client } from '@/shared/types';

export type AddClientInput = Omit<Client, 'id' | 'initials' | 'color' | 'billed' | 'outstanding' | 'invoices'>;

export function addClient(
  input: AddClientInput,
  onCloudSync?: () => void,
): Client {
  const client = useClientStore.getState().addClient(input);
  onCloudSync?.();
  return client;
}
