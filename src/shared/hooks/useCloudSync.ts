/**
 * useCloudSync — hook that triggers cloud sync when the user signs in/out.
 */
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { syncFromCloud, syncToCloud, pushLedgerEntry } from '@/shared/services/syncService';
import type { Invoice, Expense, EntryType } from '@/shared/types';

/**
 * Subscribes to auth state and syncs data from the cloud on sign-in.
 * Returns helpers that components can call to push data after mutations.
 */
export function useCloudSync() {
  const user = useAuthStore(s => s.user);
  const uid = user?.uid ?? null;
  const prevUidRef = useRef<string | null | undefined>(undefined);

  // Sync FROM cloud when uid changes (sign-in)
  useEffect(() => {
    if (uid === prevUidRef.current) return;
    prevUidRef.current = uid;
    if (!uid) return;
    syncFromCloud(uid);
  }, [uid]);

  /** Push the full data snapshot to Firestore */
  const pushSnapshot = () => {
    if (uid) syncToCloud(uid);
  };

  /** Push a single ledger entry */
  const pushEntry = (type: EntryType, data: Invoice | Expense) => {
    if (uid) pushLedgerEntry(uid, type, data);
  };

  return { pushSnapshot, pushEntry, uid };
}
