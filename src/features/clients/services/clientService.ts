/**
 * clientService – client business-logic service.
 *
 * Wraps the `useClientStore` mutation and handles any cross-cutting
 * concerns (e.g., cloud persistence) so that UI components stay thin.
 */
import { useClientStore } from '../store/useClientStore';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { pushCloudSnapshot } from '@/shared/services/cloudSnapshot';
import type { Client } from '@/lib/types';

export const clientService = {
  addClient(
    cli: Omit<Client, 'id' | 'initials' | 'color' | 'billed' | 'outstanding' | 'invoices'>,
  ): Client {
    const newClient = useClientStore.getState().addClient(cli);

    const uid = useAuthStore.getState().user?.uid;
    if (uid) pushCloudSnapshot(uid);

    return newClient;
  },
};
