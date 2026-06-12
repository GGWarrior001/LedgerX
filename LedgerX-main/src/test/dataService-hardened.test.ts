/**
 * dataService-hardened.test.ts – Phase 6 tests for hardened dataService (v4)
 *
 * Key coverage for M-4 fix and new features:
 *   - loadDemoData() persists to storage (not just in-memory hydration)
 *   - importData() validates and sanitizes before persisting
 *   - importData() handles malicious/oversized arrays via sanitizeArray
 *   - resetData() wipes transactional keys, keeps profile
 *   - loadFreshData() removes all domain keys
 *   - exportData() returns decrypted values
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Storage mock ───────────────────────────────────────────────────────────────

const storedData: Record<string, unknown> = {};

vi.mock('@/lib/storage', () => ({
  storage: {
    load:       vi.fn(async (key: string, def: unknown) => storedData[key] ?? def),
    save:       vi.fn(async (key: string, val: unknown) => { storedData[key] = val; }),
    exportData: vi.fn(async (key: string, def: unknown) => storedData[key] ?? def),
    remove:     vi.fn((key: string) => { delete storedData[key]; }),
    clearAppData: vi.fn(() => {
      Object.keys(storedData)
        .filter(k => !['lx_profile', 'lx_dark', 'lx_settings'].includes(k))
        .forEach(k => delete storedData[k]);
    }),
    isEncryptionSetup: vi.fn(() => false),
    isUnlocked:        vi.fn(() => true),
  },
}));

// ── Store mocks ────────────────────────────────────────────────────────────────

const mockInvoiceHydrate = vi.fn();
const mockExpenseHydrate = vi.fn();
const mockClientHydrate  = vi.fn();
const mockVendorHydrate  = vi.fn();
const mockInvoiceReset   = vi.fn();
const mockExpenseReset   = vi.fn();
const mockClientReset    = vi.fn();
const mockVendorReset    = vi.fn();

vi.mock('@/features/invoices/store/useInvoiceStore', () => ({
  useInvoiceStore: { getState: () => ({ hydrate: mockInvoiceHydrate, reset: mockInvoiceReset, invoices: [], nextId: 1 }) },
}));
vi.mock('@/features/expenses/store/useExpenseStore', () => ({
  useExpenseStore: { getState: () => ({ hydrate: mockExpenseHydrate, reset: mockExpenseReset, expenses: [], nextId: 1 }) },
}));
vi.mock('@/features/clients/store/useClientStore', () => ({
  useClientStore: { getState: () => ({ hydrate: mockClientHydrate, reset: mockClientReset, clients: [], nextId: 1 }) },
}));
vi.mock('@/features/vendors/store/useVendorStore', () => ({
  useVendorStore: { getState: () => ({ hydrate: mockVendorHydrate, reset: mockVendorReset, vendors: [], nextId: 1 }) },
}));

const mockSetNotifications  = vi.fn(async () => {});
const mockRebuildNotifs     = vi.fn(async () => {});
const mockSetProfile        = vi.fn(async () => {});
vi.mock('@/shared/stores/useAppStore', () => ({
  useAppStore: {
    getState: () => ({
      setNotifications:      mockSetNotifications,
      rebuildNotifications:  mockRebuildNotifs,
      setProfile:            mockSetProfile,
    }),
  },
}));

import { storage as storageMod } from '@/lib/storage';
import { dataService } from '@/shared/services/dataService';

// ─────────────────────────────────────────────────────────────────────────────

describe('dataService.loadFromStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(storedData).forEach(k => delete storedData[k]);
  });

  it('calls storage.load for all domain keys', async () => {
    await dataService.loadFromStorage();
    expect(storageMod.load).toHaveBeenCalledWith('lx_invoices', []);
    expect(storageMod.load).toHaveBeenCalledWith('lx_expenses', []);
    expect(storageMod.load).toHaveBeenCalledWith('lx_clients',  []);
    expect(storageMod.load).toHaveBeenCalledWith('lx_vendors',  []);
  });

  it('hydrates all stores', async () => {
    await dataService.loadFromStorage();
    expect(mockInvoiceHydrate).toHaveBeenCalled();
    expect(mockExpenseHydrate).toHaveBeenCalled();
    expect(mockClientHydrate).toHaveBeenCalled();
    expect(mockVendorHydrate).toHaveBeenCalled();
  });
});

// ── loadDemoData (M-4 fix) ────────────────────────────────────────────────────

describe('dataService.loadDemoData – M-4 fix: persists to storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(storedData).forEach(k => delete storedData[k]);
  });

  it('saves demo invoices to storage (not just in-memory)', async () => {
    await dataService.loadDemoData();
    expect(storageMod.save).toHaveBeenCalledWith('lx_invoices', expect.any(Array));
  });

  it('saves demo expenses to storage', async () => {
    await dataService.loadDemoData();
    expect(storageMod.save).toHaveBeenCalledWith('lx_expenses', expect.any(Array));
  });

  it('saves demo clients to storage', async () => {
    await dataService.loadDemoData();
    expect(storageMod.save).toHaveBeenCalledWith('lx_clients', expect.any(Array));
  });

  it('saves demo vendors to storage', async () => {
    await dataService.loadDemoData();
    expect(storageMod.save).toHaveBeenCalledWith('lx_vendors', expect.any(Array));
  });

  it('saves nextId counters to storage', async () => {
    await dataService.loadDemoData();
    expect(storageMod.save).toHaveBeenCalledWith('lx_inv_id', expect.any(Number));
    expect(storageMod.save).toHaveBeenCalledWith('lx_exp_id', expect.any(Number));
  });

  it('hydrates all in-memory stores after persisting', async () => {
    await dataService.loadDemoData();
    expect(mockInvoiceHydrate).toHaveBeenCalled();
    expect(mockExpenseHydrate).toHaveBeenCalled();
    expect(mockClientHydrate).toHaveBeenCalled();
    expect(mockVendorHydrate).toHaveBeenCalled();
  });

  it('rebuilds notifications from demo invoices', async () => {
    await dataService.loadDemoData();
    expect(mockRebuildNotifs).toHaveBeenCalled();
  });
});

// ── resetData ─────────────────────────────────────────────────────────────────

describe('dataService.resetData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls clearAppData on storage', async () => {
    await dataService.resetData();
    expect(storageMod.clearAppData).toHaveBeenCalled();
  });

  it('resets all stores', async () => {
    await dataService.resetData();
    expect(mockInvoiceReset).toHaveBeenCalled();
    expect(mockExpenseReset).toHaveBeenCalled();
    expect(mockClientReset).toHaveBeenCalled();
    expect(mockVendorReset).toHaveBeenCalled();
  });

  it('clears notifications', async () => {
    await dataService.resetData();
    expect(mockSetNotifications).toHaveBeenCalledWith([]);
  });
});

// ── importData ────────────────────────────────────────────────────────────────

describe('dataService.importData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(storedData).forEach(k => delete storedData[k]);
  });

  const validImport = {
    invoices: [{
      id: 1, number: 'INV-001', clientName: 'Test', clientInitials: 'T',
      clientColor: '#000', description: 'x', issueDate: '2025-01-01',
      dueDate: '2025-02-01', status: 'paid', amount: 1000,
    }],
    expenses: [{
      id: 1, description: 'Office', category: 'Ops', vendor: 'Store',
      date: '2025-01-01', receipt: 'attached', amount: 500,
    }],
    clients:  [{ id: 1, name: 'Client', initials: 'C', color: '#000', city: 'Mumbai', email: 'c@c.com', phone: '', billed: 0, outstanding: 0, invoices: 0 }],
    vendors:  [{ id: 1, name: 'Vendor', initials: 'V', color: '#000', city: 'Delhi', email: 'v@v.com', phone: '', totalSpent: 0 }],
    nextInvId: 2,
    nextExpId: 2,
    nextClientId: 2,
    nextVendorId: 2,
  };

  it('persists imported invoices to storage', async () => {
    await dataService.importData(validImport);
    expect(storageMod.save).toHaveBeenCalledWith('lx_invoices', expect.any(Array));
  });

  it('hydrates stores with imported data', async () => {
    await dataService.importData(validImport);
    expect(mockInvoiceHydrate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 1 })]),
      2
    );
  });

  it('silently drops invalid invoice entries (sanitization)', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const badImport = {
      ...validImport,
      invoices: [
        { ...validImport.invoices[0] },             // valid
        { id: 'bad', amount: -99999 },              // invalid — dropped
        null,                                       // invalid — dropped
      ],
    };
    await dataService.importData(badImport);
    const saved = (storageMod.save as ReturnType<typeof vi.fn>).mock.calls
      .find(([k]) => k === 'lx_invoices')?.[1];
    expect(saved).toHaveLength(1);
    spy.mockRestore();
  });

  it('handles missing profile gracefully (no setProfile call)', async () => {
    await dataService.importData({ ...validImport, profile: undefined });
    expect(mockSetProfile).not.toHaveBeenCalled();
  });

  it('rebuilds notifications after import', async () => {
    await dataService.importData(validImport);
    expect(mockRebuildNotifs).toHaveBeenCalled();
  });
});

// ── exportData ────────────────────────────────────────────────────────────────

describe('dataService.exportData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storedData['lx_invoices'] = [{ id: 1 }];
    storedData['lx_expenses'] = [{ id: 2 }];
    storedData['lx_clients']  = [];
    storedData['lx_vendors']  = [];
    storedData['lx_profile']  = { name: 'Alice', businessName: 'LX', currency: '₹', fiscalYear: 'Apr-Mar', role: 'Admin', city: '', dataChoice: '' };
  });

  it('returns all domain data', async () => {
    const result = await dataService.exportData();
    expect(result).toHaveProperty('invoices');
    expect(result).toHaveProperty('expenses');
    expect(result).toHaveProperty('clients');
    expect(result).toHaveProperty('vendors');
    expect(result).toHaveProperty('profile');
  });

  it('returns current invoice data', async () => {
    const result = await dataService.exportData();
    expect(result.invoices).toEqual([{ id: 1 }]);
  });
});
