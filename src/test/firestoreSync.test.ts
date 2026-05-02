/**
 * src/test/firestoreSync.test.ts
 *
 * Phase 4 — Cloud sync tests with mocked Firebase/Firestore.
 *
 * Coverage targets:
 *   - fetchCloudData success path (returns CloudData)
 *   - fetchCloudData failure path (returns null)
 *   - saveCloudData merge behavior (setDoc called with merge: true)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CloudData } from '@/lib/firestoreSync';

// ── Mock firebase/firestore ───────────────────────────────────────────────────

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _seconds: 0 }));
const mockDoc = vi.fn((_db: unknown, ...args: string[]) => ({ path: args.join('/') }));
const mockCollection = vi.fn((_db: unknown, ...args: string[]) => ({ path: args.join('/') }));

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  addDoc: mockAddDoc,
  getDocs: mockGetDocs,
  collection: mockCollection,
  serverTimestamp: mockServerTimestamp,
}));

// Mock the firebase.ts module to avoid needing real credentials
vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('fetchCloudData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns CloudData when document exists', async () => {
    const mockData: CloudData = {
      invoices: [{ id: 1, number: 'INV-001', clientName: 'ACME', clientInitials: 'AC', clientColor: '#000', description: 'Test', issueDate: '2025-01-01', dueDate: '2025-02-01', status: 'paid', amount: 1000 }],
      expenses: [],
      clients: [],
      vendors: [],
      profile: null,
      nextInvId: 2,
      nextExpId: 1,
      nextClientId: 1,
      nextVendorId: 1,
    };

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => mockData,
    });

    const { fetchCloudData } = await import('@/lib/firestoreSync');
    const result = await fetchCloudData('user123');

    expect(result).not.toBeNull();
    expect(result?.invoices).toHaveLength(1);
    expect(result?.invoices[0].amount).toBe(1000);
    expect(result?.nextInvId).toBe(2);
  });

  it('returns null when document does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });

    const { fetchCloudData } = await import('@/lib/firestoreSync');
    const result = await fetchCloudData('user123');

    expect(result).toBeNull();
  });

  it('returns null on Firestore error', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('Network error'));

    const { fetchCloudData } = await import('@/lib/firestoreSync');
    const result = await fetchCloudData('user123');

    expect(result).toBeNull();
  });
});

describe('saveCloudData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
  });

  it('calls setDoc with merge:true for non-destructive updates', async () => {
    const data: CloudData = {
      invoices: [],
      expenses: [],
      clients: [],
      vendors: [],
      profile: null,
      nextInvId: 1,
      nextExpId: 1,
      nextClientId: 1,
      nextVendorId: 1,
    };

    const { saveCloudData } = await import('@/lib/firestoreSync');
    await saveCloudData('user123', data);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    // Third argument should be { merge: true }
    expect(mockSetDoc.mock.calls[0][2]).toEqual({ merge: true });
  });

  it('does not throw on Firestore write failure', async () => {
    mockSetDoc.mockRejectedValueOnce(new Error('Quota exceeded'));

    const { saveCloudData } = await import('@/lib/firestoreSync');
    await expect(
      saveCloudData('user123', {
        invoices: [], expenses: [], clients: [], vendors: [],
        profile: null, nextInvId: 1, nextExpId: 1, nextClientId: 1, nextVendorId: 1,
      })
    ).resolves.not.toThrow();
  });
});
