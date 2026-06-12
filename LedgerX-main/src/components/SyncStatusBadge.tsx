/**
 * SyncStatusBadge.tsx – Cloud sync health indicator (PHASE 9 / H-3)
 *
 * Subscribes to `syncHealth` observable from firestoreSync.ts and renders
 * a compact status pill in the Topbar. Surfaces sync state that was
 * previously invisible (H-3 fix: silent failure → visible status).
 *
 * States:
 *   idle    → no indicator shown (no cloud configured)
 *   pending → pulsing amber dot + "Queued"
 *   syncing → spinning icon + "Syncing…"
 *   synced  → green dot + "Synced" (fades after 3s)
 *   error   → red dot + "Sync failed" (with tooltip showing error)
 */
import { useState, useEffect } from 'react';
import { syncHealth, type SyncStatus } from '@/lib/firestoreSync';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

interface SyncState {
  status:  SyncStatus;
  error:   string | null;
  pending: number;
}

export function SyncStatusBadge() {
  const user = useAuthStore(s => s.user);

  const [state, setState] = useState<SyncState>({
    status:  'idle',
    error:   null,
    pending: 0,
  });
  const [showSynced, setShowSynced] = useState(false);

  useEffect(() => {
    const unsub = syncHealth.subscribe((s) => {
      setState(s);
      if (s.status === 'synced') {
        setShowSynced(true);
        const t = setTimeout(() => setShowSynced(false), 3000);
        return () => clearTimeout(t);
      }
    });
    return unsub;
  }, []);

  // Don't show badge if not signed in to Firebase
  if (!user) return null;

  const { status, error, pending } = state;

  if (status === 'idle') return null;
  if (status === 'synced' && !showSynced) return null;

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all select-none ${
        status === 'error'   ? 'bg-destructive/10 text-destructive border border-destructive/20' :
        status === 'syncing' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
        status === 'pending' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                               'bg-green-500/10 text-green-700 border border-green-500/20'
      }`}
      title={error ?? undefined}
      role="status"
      aria-live="polite"
      aria-label={`Cloud sync: ${status}${pending > 0 ? `, ${pending} pending` : ''}`}
    >
      {/* Status indicator */}
      {status === 'syncing' && (
        <div className="w-2.5 h-2.5 border border-blue-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      )}
      {status === 'pending' && (
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
      )}
      {status === 'error' && (
        <div className="w-2 h-2 rounded-full bg-destructive" aria-hidden="true" />
      )}
      {status === 'synced' && (
        <div className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
      )}

      {/* Label */}
      <span>
        {status === 'syncing' && 'Syncing…'}
        {status === 'pending' && `Queued${pending > 1 ? ` (${pending})` : ''}`}
        {status === 'error'   && 'Sync failed'}
        {status === 'synced'  && 'Synced'}
      </span>
    </div>
  );
}
