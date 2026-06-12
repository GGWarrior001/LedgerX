/**
 * firestoreSync-hardened.test.ts – Tests for hardened sync layer (v4)
 *
 * Covers:
 *   H-3 fixes: retry queue, sync health monitor, conflict resolution
 *
 * Note: These tests mock Firestore internals rather than making real network
 * calls. The mock is set up via vi.mock('firebase/firestore').
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn((db, ...path) => ({ path: path.join('/') })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _type: 'timestamp' })),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
  isFirebaseConfigured: true,
}));

import * as firestore from 'firebase/firestore';
import { syncHealth, saveCloudData, resolveCloudConflict } from './firestoreSync';
import type { CloudData } from './firestoreSync';

const MOCK_CLOUD_DATA: CloudData = {
  invoices: [{ id: 1, number: 'INV-001', clientName: 'Test', clientInitials: 'T', clientColor: '#000', description: 'x', issueDate: '2025-01-01', dueDate: '2025-02-01', status: 'paid', amount: 1000 }],
  expenses: [],
  clients: [],
  vendors: [],
  profile: null,
  nextInvId: 2,
  nextExpId: 1,
  nextClientId: 1,
  nextVendorId: 1,
};

// ─── SyncHealthMonitor ────────────────────────────────────────────────────────

describe('SyncHealthMonitor', () => {
  it('starts in idle state', () => {
    const state = syncHealth.get();
    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
  });

  it('notifies subscribers on update', () => {
    const listener = vi.fn();
    const unsub = syncHealth.subscribe(listener);
    // subscribe() calls listener immediately
    expect(listener).toHaveBeenCalledTimes(1);

    syncHealth.update({ status: 'pending', pending: 1 });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1][0].status).toBe('pending');

    unsub();
    syncHealth.update({ status: 'idle' });
    // Should NOT be called after unsubscribe
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

// ─── saveCloudData (enqueue) ──────────────────────────────────────────────────

describe('saveCloudData – retry queue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(firestore.setDoc).mockResolvedValue(undefined);
    syncHealth.update({ status: 'idle', error: null, pending: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('enqueues a write and updates status to pending', async () => {
    vi.mocked(firestore.setDoc).mockResolvedValueOnce(undefined);
    saveCloudData('user-123', MOCK_CLOUD_DATA);

    // Should be pending or syncing after enqueue
    const status = syncHealth.get().status;
    expect(['pending', 'syncing']).toContain(status);
  });

  it('calls setDoc with the uid path', async () => {
    vi.mocked(firestore.setDoc).mockResolvedValueOnce(undefined);
    saveCloudData('user-456', MOCK_CLOUD_DATA);

    // Allow microtasks
    await vi.runAllTimersAsync();
    await new Promise(r => setTimeout(r, 10));

    expect(vi.mocked(firestore.setDoc)).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining('user-456') }),
      expect.objectContaining({ invoices: MOCK_CLOUD_DATA.invoices }),
      { merge: true }
    );
  });

  it('retries on transient failure', async () => {
    vi.mocked(firestore.setDoc)
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce(undefined);

    saveCloudData('user-retry', MOCK_CLOUD_DATA);

    // Advance past first retry backoff (2s)
    await vi.advanceTimersByTimeAsync(3_000);
    await new Promise(r => setTimeout(r, 50));

    expect(vi.mocked(firestore.setDoc)).toHaveBeenCalledTimes(2);
  });

  it('sets error status after max retry exhaustion', async () => {
    vi.mocked(firestore.setDoc).mockRejectedValue(new Error('Persistent failure'));

    saveCloudData('user-fail', MOCK_CLOUD_DATA);

    // Advance far past all retries (2+4+8+16+32 = 62s)
    await vi.advanceTimersByTimeAsync(70_000);
    await new Promise(r => setTimeout(r, 100));

    const state = syncHealth.get();
    expect(state.status).toBe('error');
    expect(state.error).toContain('5 attempts');
  });
});

// ─── resolveCloudConflict ─────────────────────────────────────────────────────

describe('resolveCloudConflict – last-write-wins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when cloud data does not exist', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({ exists: () => false } as any);
    const result = await resolveCloudConflict('user-123', Date.now());
    expect(result).toBeNull();
  });

  it('returns cloud data when cloud is newer than local', async () => {
    const cloudTime = Date.now() + 5_000;
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        ...MOCK_CLOUD_DATA,
        updatedAt: { toMillis: () => cloudTime },
      }),
    } as any);

    const result = await resolveCloudConflict('user-123', Date.now());
    expect(result).not.toBeNull();
  });

  it('returns null when local is newer than cloud', async () => {
    const cloudTime = Date.now() - 5_000;
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        ...MOCK_CLOUD_DATA,
        updatedAt: { toMillis: () => cloudTime },
      }),
    } as any);

    const result = await resolveCloudConflict('user-123', Date.now());
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.mocked(firestore.getDoc).mockRejectedValueOnce(new Error('Offline'));
    const result = await resolveCloudConflict('user-123', Date.now());
    expect(result).toBeNull();
  });
});
