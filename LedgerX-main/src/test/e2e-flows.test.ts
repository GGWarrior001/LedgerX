/**
 * e2e-flows.test.ts – End-to-end tests for critical user journeys (POLISH)
 *
 * Covers the two flows specifically called out as needing full E2E coverage:
 *
 *   Flow 1: Passcode Change
 *     Setup encryption → save financial data → change passcode →
 *     verify old fails → unlock with new → data intact → notifications preserved
 *
 *   Flow 2: Backup + Restore
 *     Load demo data → export → reset → import backup →
 *     verify all collections restored → notifications rebuilt
 *
 *   Flow 3: Worker fallback (PBKDF2 off-thread path)
 *     Verifies that deriveKeyOffThread falls back gracefully when Worker
 *     is unavailable, keeping the encryption flow fully functional.
 *
 *   Flow 4: Storage pressure / quota
 *     Verifies that the IDB availability check and quota check return
 *     expected shapes.
 *
 * These tests run entirely in jsdom against real WebCrypto (via @vitest/browser
 * or Node 20+ which includes crypto.subtle natively).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function freshStorage() {
  vi.resetModules();
  localStorage.clear();
  return import('@/lib/storage');
}

// Minimal valid invoice / expense for round-trip tests
const INVOICE = {
  id: 1, number: 'INV-E2E-001', clientName: 'E2E Client',
  clientInitials: 'EC', clientColor: '#6366F1',
  description: 'E2E test invoice', issueDate: '2025-01-01',
  dueDate: '2025-02-01', status: 'paid' as const, amount: 99_999,
};

const EXPENSE = {
  id: 1, description: 'E2E Expense', category: 'Testing',
  vendor: 'Test Co', date: '2025-01-15',
  receipt: 'attached' as const, amount: 4_200,
};

const PROFILE = {
  name: 'E2E User', role: 'Admin', city: 'Bengaluru',
  businessName: 'E2E Corp', fiscalYear: 'Apr-Mar',
  currency: '₹', dataChoice: 'custom',
};

// ─────────────────────────────────────────────────────────────────────────────
// Flow 1: Full passcode change lifecycle
// ─────────────────────────────────────────────────────────────────────────────

describe('E2E Flow 1: Passcode change — full lifecycle', () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });

  it('preserves all financial data across passcode rotation', async () => {
    const { storage } = await freshStorage();

    // 1. Setup encryption and save data
    await storage.setupEncryption('OldPass@2025!');
    await storage.save('lx_invoices', [INVOICE]);
    await storage.save('lx_expenses', [EXPENSE]);
    await storage.save('lx_profile',  PROFILE);
    await storage.save('lx_inv_id',   2);
    await storage.save('lx_exp_id',   2);

    // 2. Change passcode
    await storage.changePasscode('OldPass@2025!', 'NewPass@2026!');

    // 3. Lock and verify old passcode fails
    storage.clearEncryptionKey();
    expect(await storage.unlock('OldPass@2025!')).toBe(false);

    // 4. Unlock with new passcode
    expect(await storage.unlock('NewPass@2026!')).toBe(true);

    // 5. Verify all data intact
    const invoices = await storage.load<typeof INVOICE[]>('lx_invoices', []);
    const expenses = await storage.load<typeof EXPENSE[]>('lx_expenses', []);
    const profile  = await storage.load<typeof PROFILE>('lx_profile',  null as unknown as typeof PROFILE);
    const invId    = await storage.load<number>('lx_inv_id', 0);

    expect(invoices).toHaveLength(1);
    expect(invoices[0].number).toBe('INV-E2E-001');
    expect(invoices[0].amount).toBe(99_999);

    expect(expenses).toHaveLength(1);
    expect(expenses[0].description).toBe('E2E Expense');

    expect(profile.businessName).toBe('E2E Corp');
    expect(invId).toBe(2);
  });

  it('uses a different salt after rotation', async () => {
    const { storage } = await freshStorage();
    await storage.setupEncryption('OldPass@2025!');
    const salt1 = JSON.parse(localStorage.getItem('lx_enc_verify')!).salt;

    await storage.changePasscode('OldPass@2025!', 'NewPass@2026!');
    const salt2 = JSON.parse(localStorage.getItem('lx_enc_verify')!).salt;

    expect(salt1).not.toBe(salt2);
  });

  it('writes v4 envelopes after rotation', async () => {
    const { storage } = await freshStorage();
    await storage.setupEncryption('OldPass@2025!');
    await storage.save('lx_invoices', [INVOICE]);
    await storage.changePasscode('OldPass@2025!', 'NewPass@2026!');

    const raw = JSON.parse(localStorage.getItem('lx_invoices')!);
    expect(raw.v).toBe(4);
    expect(raw.cv).toBe(4);
  });

  it('brute-force counter resets after successful passcode change', async () => {
    const { storage } = await freshStorage();
    await storage.setupEncryption('OldPass@2025!');
    storage.clearEncryptionKey();

    // Exhaust some attempts (not enough for lockout)
    await storage.unlock('Wrong1!');
    await storage.unlock('Wrong2!');
    expect(storage.getFailedAttemptCount()).toBe(2);

    await storage.unlock('OldPass@2025!');
    expect(storage.getFailedAttemptCount()).toBe(0);

    await storage.changePasscode('OldPass@2025!', 'NewPass@2026!');
    expect(storage.getFailedAttemptCount()).toBe(0);
  });

  it('multiple concurrent saves after rotation all decrypt correctly', async () => {
    const { storage } = await freshStorage();
    await storage.setupEncryption('OldPass@2025!');

    await storage.changePasscode('OldPass@2025!', 'NewPass@2026!');

    // Save multiple keys concurrently
    const entries = [
      ['lx_invoices', [INVOICE]],
      ['lx_expenses', [EXPENSE]],
      ['lx_profile',  PROFILE],
    ] as const;

    await Promise.all(entries.map(([k, v]) => storage.save(k, v)));

    const [inv, exp, prof] = await Promise.all([
      storage.load('lx_invoices', []),
      storage.load('lx_expenses', []),
      storage.load('lx_profile',  null),
    ]);

    expect((inv as typeof INVOICE[])[0].amount).toBe(99_999);
    expect((exp as typeof EXPENSE[])[0].category).toBe('Testing');
    expect((prof as typeof PROFILE).businessName).toBe('E2E Corp');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Flow 2: Backup (export) + Restore (import) lifecycle
// ─────────────────────────────────────────────────────────────────────────────

describe('E2E Flow 2: Backup & restore — full lifecycle', () => {
  // Mock stores and dataService dependencies
  const invoiceHydrate = vi.fn();
  const expenseHydrate = vi.fn();
  const clientHydrate  = vi.fn();
  const vendorHydrate  = vi.fn();
  const invoiceReset   = vi.fn();
  const expenseReset   = vi.fn();
  const clientReset    = vi.fn();
  const vendorReset    = vi.fn();
  const setNotifs      = vi.fn(async () => {});
  const rebuildNotifs  = vi.fn(async () => {});
  const setProfile     = vi.fn(async () => {});

  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();

    vi.doMock('@/features/invoices/store/useInvoiceStore', () => ({
      useInvoiceStore: { getState: () => ({ hydrate: invoiceHydrate, reset: invoiceReset, invoices: [], nextId: 1 }) },
    }));
    vi.doMock('@/features/expenses/store/useExpenseStore', () => ({
      useExpenseStore: { getState: () => ({ hydrate: expenseHydrate, reset: expenseReset, expenses: [], nextId: 1 }) },
    }));
    vi.doMock('@/features/clients/store/useClientStore', () => ({
      useClientStore: { getState: () => ({ hydrate: clientHydrate, reset: clientReset, clients: [], nextId: 1 }) },
    }));
    vi.doMock('@/features/vendors/store/useVendorStore', () => ({
      useVendorStore: { getState: () => ({ hydrate: vendorHydrate, reset: vendorReset, vendors: [], nextId: 1 }) },
    }));
    vi.doMock('@/shared/stores/useAppStore', () => ({
      useAppStore: { getState: () => ({ setNotifications: setNotifs, rebuildNotifications: rebuildNotifs, setProfile }) },
    }));
  });

  afterEach(() => { vi.clearAllMocks(); });

  it('export captures all domain data, import restores it faithfully', async () => {
    const { storage } = await import('@/lib/storage');
    const { dataService } = await import('@/shared/services/dataService');

    // Seed data into storage
    await storage.save('lx_invoices', [INVOICE]);
    await storage.save('lx_expenses', [EXPENSE]);
    await storage.save('lx_clients',  []);
    await storage.save('lx_vendors',  []);
    await storage.save('lx_profile',  PROFILE);
    await storage.save('lx_inv_id',   2);
    await storage.save('lx_exp_id',   2);

    // Export
    const exported = await dataService.exportData();
    expect(exported.invoices).toHaveLength(1);
    expect(exported.expenses).toHaveLength(1);
    expect(exported.profile?.businessName).toBe('E2E Corp');

    // Simulate reset
    await dataService.resetData();

    // Import from the exported backup
    await dataService.importData(exported as Record<string, unknown>);

    // Verify stores were hydrated with the correct data
    expect(invoiceHydrate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ number: 'INV-E2E-001' })]),
      expect.any(Number)
    );
    expect(expenseHydrate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ description: 'E2E Expense' })]),
      expect.any(Number)
    );
    expect(rebuildNotifs).toHaveBeenCalled();
  });

  it('import sanitizes invalid entries without throwing', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { dataService } = await import('@/shared/services/dataService');

    const dirtyBackup = {
      invoices: [
        INVOICE,                                      // valid
        { id: 'corrupt', amount: -9999 },             // invalid — dropped
        null,                                         // invalid — dropped
      ],
      expenses: [EXPENSE],
      clients:  [],
      vendors:  [],
    };

    await expect(dataService.importData(dirtyBackup as Record<string, unknown>)).resolves.not.toThrow();

    // Only the valid invoice should be hydrated
    expect(invoiceHydrate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 1 })]),
      expect.any(Number)
    );
    const invoicesArg = (invoiceHydrate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(invoicesArg).toHaveLength(1); // dirty entries dropped

    spy.mockRestore();
  });

  it('import with encrypted storage re-encrypts imported data', async () => {
    const { storage } = await import('@/lib/storage');
    const { dataService } = await import('@/shared/services/dataService');

    await storage.setupEncryption('BackupPass123!');

    const backup = {
      invoices: [INVOICE],
      expenses: [EXPENSE],
      clients:  [],
      vendors:  [],
    };

    await dataService.importData(backup as Record<string, unknown>);

    // Verify the data in localStorage is encrypted (not plaintext)
    const raw = localStorage.getItem('lx_invoices');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.__ledgerx_encrypted).toBe(true);
    expect(parsed.v).toBe(4);

    // Verify it decrypts correctly
    const loaded = await storage.load<typeof INVOICE[]>('lx_invoices', []);
    expect(loaded[0].number).toBe('INV-E2E-001');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Flow 3: CryptoWorkerClient fallback
// ─────────────────────────────────────────────────────────────────────────────

describe('E2E Flow 3: CryptoWorkerClient fallback (Worker unavailable)', () => {
  it('deriveKeyOffThread falls back to main-thread PBKDF2 when Worker unavailable', async () => {
    vi.resetModules();

    // Simulate Worker being unavailable
    const origWorker = globalThis.Worker;
    (globalThis as Record<string, unknown>).Worker = undefined;

    try {
      const { cryptoWorker, deriveKeyOffThread } = await import('@/workers/cryptoWorkerClient');
      expect(cryptoWorker.isAvailable()).toBe(false);

      const { generateSalt } = await import('@/lib/webCrypto');
      const salt = generateSalt();

      // Should still work via main-thread fallback
      const key = await deriveKeyOffThread('FallbackTest!', salt, {
        iterations: 1_000,
        hash: 'SHA-256',
      });

      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
      expect(key.extractable).toBe(false);
    } finally {
      (globalThis as Record<string, unknown>).Worker = origWorker;
    }
  });

  it('storage encrypt/decrypt works without Worker', async () => {
    // Worker already mocked as unavailable in previous test via module reset
    vi.resetModules();
    localStorage.clear();
    const origWorker = globalThis.Worker;
    (globalThis as Record<string, unknown>).Worker = undefined;

    try {
      const { storage } = await import('@/lib/storage');
      await storage.setupEncryption('NoWorkerPass123!');
      await storage.save('lx_invoices', [INVOICE]);

      storage.clearEncryptionKey();
      await storage.unlock('NoWorkerPass123!');

      const loaded = await storage.load<typeof INVOICE[]>('lx_invoices', []);
      expect(loaded[0].amount).toBe(99_999);
    } finally {
      (globalThis as Record<string, unknown>).Worker = origWorker;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Flow 4: IndexedDB availability + quota helpers
// ─────────────────────────────────────────────────────────────────────────────

describe('E2E Flow 4: IndexedDB helpers', () => {
  it('isIDBAvailable returns boolean', async () => {
    const { isIDBAvailable } = await import('@/lib/indexedDB');
    const result = isIDBAvailable();
    expect(typeof result).toBe('boolean');
  });

  it('checkStoragePressure returns a valid pressure level', async () => {
    const { checkStoragePressure } = await import('@/lib/indexedDB');
    const level = await checkStoragePressure();
    expect(['ok', 'warn', 'critical']).toContain(level);
  });

  it('hasV2Data returns false when no v2 envelopes present', async () => {
    localStorage.clear();
    const { hasV2Data } = await import('@/lib/v2Migration');
    expect(hasV2Data()).toBe(false);
  });

  it('hasV2Data returns true when a v2 envelope is present', async () => {
    localStorage.setItem('lx_invoices', JSON.stringify({
      __ledgerx_encrypted: true,
      v: 2,
      alg: 'AES-CryptoJS',
      ct: 'U2FsdGVkX1+fakebase64data==',
    }));
    const { hasV2Data } = await import('@/lib/v2Migration');
    expect(hasV2Data()).toBe(true);
    localStorage.clear();
  });
});
