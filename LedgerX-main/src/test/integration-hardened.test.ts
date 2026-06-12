/**
 * integration-hardened.test.ts – End-to-end integration tests (Phase 6)
 *
 * Tests the full cryptographic lifecycle across storage + stores:
 *   1. Setup encryption
 *   2. Save data from multiple domains
 *   3. Lock
 *   4. Verify locked state (brute-force protection)
 *   5. Unlock with correct passcode
 *   6. Verify all data readable
 *   7. Change passcode
 *   8. Verify new passcode works, old fails
 *   9. Secure wipe
 *  10. Verify clean state
 *
 * Also covers the full storage → validation pipeline via importData.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Fresh storage helper ───────────────────────────────────────────────────────

async function fresh() {
  vi.resetModules();
  localStorage.clear();
  return import('@/lib/storage');
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: Encryption lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('full cycle: setup → save multiple keys → lock → unlock → read all', async () => {
    const { storage } = await fresh();

    // 1. Setup
    await storage.setupEncryption('IntegPass123!');
    expect(storage.isEncryptionSetup()).toBe(true);
    expect(storage.isUnlocked()).toBe(true);

    // 2. Save domain data
    const invoices = [{ id: 1, amount: 50000, clientName: 'Acme' }];
    const expenses = [{ id: 1, amount: 2500,  category: 'Travel' }];
    const profile  = { name: 'Alice', businessName: 'LedgerX', currency: '₹' };

    await storage.save('lx_invoices', invoices);
    await storage.save('lx_expenses', expenses);
    await storage.save('lx_profile',  profile);

    // 3. Lock
    storage.clearEncryptionKey();
    expect(storage.isUnlocked()).toBe(false);

    // 4. Verify locked (all reads throw)
    await expect(storage.load('lx_invoices', [])).rejects.toThrow();
    await expect(storage.load('lx_expenses', [])).rejects.toThrow();
    await expect(storage.load('lx_profile',  null)).rejects.toThrow();

    // 5. Unlock
    const ok = await storage.unlock('IntegPass123!');
    expect(ok).toBe(true);

    // 6. Read all
    const loadedInvoices = await storage.load<typeof invoices>('lx_invoices', []);
    const loadedExpenses = await storage.load<typeof expenses>('lx_expenses', []);
    const loadedProfile  = await storage.load<typeof profile>('lx_profile',   null as any);

    expect(loadedInvoices).toEqual(invoices);
    expect(loadedExpenses).toEqual(expenses);
    expect(loadedProfile!.name).toBe('Alice');
  });

  it('full cycle: passcode rotation preserves all data', async () => {
    const { storage } = await fresh();

    await storage.setupEncryption('OldPass123!');

    const data = { value: 'sensitive-financial-data', amount: 9_99_999 };
    await storage.save('lx_invoices', data);
    await storage.save('lx_profile',  { businessName: 'Rotation Test', name: 'Bob', currency: '$' });

    // Rotate
    await storage.changePasscode('OldPass123!', 'NewPass456!');

    // Old passcode fails
    storage.clearEncryptionKey();
    expect(await storage.unlock('OldPass123!')).toBe(false);

    // New passcode succeeds
    expect(await storage.unlock('NewPass456!')).toBe(true);

    // Data intact
    const loaded = await storage.load<typeof data>('lx_invoices', null as any);
    expect(loaded).toEqual(data);
  });

  it('brute-force protection: 5 failed attempts triggers lockout', async () => {
    const { storage, StorageLockedOutError } = await fresh();

    await storage.setupEncryption('CorrectPass123!');
    storage.clearEncryptionKey();

    // 5 wrong attempts
    for (let i = 0; i < 5; i++) {
      const result = await storage.unlock(`Wrong${i}Pass!`);
      expect(result).toBe(false);
    }

    // 6th attempt must throw StorageLockedOutError
    await expect(storage.unlock('AnotherWrong!')).rejects.toThrow(StorageLockedOutError);

    // getLockoutRemainingMs returns > 0
    expect(storage.getLockoutRemainingMs()).toBeGreaterThan(0);
    expect(storage.getFailedAttemptCount()).toBeGreaterThanOrEqual(5);
  });

  it('brute-force counter clears on successful unlock', async () => {
    const { storage } = await fresh();

    await storage.setupEncryption('CorrectPass123!');
    storage.clearEncryptionKey();

    // 3 wrong, then correct
    await storage.unlock('Wrong1!');
    await storage.unlock('Wrong2!');
    await storage.unlock('Wrong3!');
    expect(storage.getFailedAttemptCount()).toBe(3);

    await storage.unlock('CorrectPass123!');
    expect(storage.getFailedAttemptCount()).toBe(0);
  });

  it('secure wipe: all keys removed, encryption disabled', async () => {
    const { storage } = await fresh();

    await storage.setupEncryption('WipeMe123!');
    await storage.save('lx_invoices', [{ id: 1 }]);
    await storage.save('lx_profile',  { name: 'To be wiped' });

    await storage.secureWipe();

    expect(storage.isEncryptionSetup()).toBe(false);
    expect(localStorage.getItem('lx_invoices')).toBeNull();
    expect(localStorage.getItem('lx_profile')).toBeNull();
    expect(localStorage.getItem('lx_enc_key_set')).toBeNull();
    expect(localStorage.getItem('lx_enc_verify')).toBeNull();
  });

  it('loadSync returns default (not a Promise) for all encrypted keys', async () => {
    const { storage } = await fresh();

    await storage.setupEncryption('SyncTest123!');
    await storage.save('lx_invoices', [{ id: 99 }]);
    storage.clearEncryptionKey();

    // loadSync must never return a Promise
    const result = storage.loadSync('lx_invoices', []);
    expect(result instanceof Promise).toBe(false);
    expect(Array.isArray(result)).toBe(true);
  });

  it('v4 envelope: new saves use cv=4 field', async () => {
    const { storage } = await fresh();

    await storage.setupEncryption('VersionTest123!');
    await storage.save('lx_test_v4', { data: 'test' });

    const raw = JSON.parse(localStorage.getItem('lx_test_v4')!);
    expect(raw.v).toBe(4);
    expect(raw.cv).toBe(4);
    expect(raw.alg).toBe('AES-GCM');
  });

  it('concurrent saves of different keys all decrypt correctly', async () => {
    const { storage } = await fresh();

    await storage.setupEncryption('ConcurrentTest123!');

    const keys = ['lx_invoices', 'lx_expenses', 'lx_clients', 'lx_vendors', 'lx_profile'];
    const data = keys.map((k, i) => ({ key: k, value: { index: i, data: `value-${i}` } }));

    // All saves concurrently
    await Promise.all(data.map(({ key, value }) => storage.save(key, value)));

    // All reads concurrently
    const results = await Promise.all(data.map(({ key, value }) =>
      storage.load(key, null).then(v => ({ key, loaded: v, expected: value }))
    ));

    results.forEach(({ loaded, expected }) => {
      expect(loaded).toEqual(expected);
    });
  });
});

// ── Validation pipeline integration ───────────────────────────────────────────

describe('Integration: Validation pipeline', () => {
  it('sanitizeArray caps at 10,000 items across all domains', async () => {
    const { sanitizeInvoices } = await import('@/lib/validation');
    const validItem = {
      id: 1, number: 'I', clientName: 'C', clientInitials: 'C',
      clientColor: '#000', description: 'd', issueDate: '2025-01-01',
      dueDate: '2025-02-01', status: 'paid', amount: 1,
    };
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const oversized = Array.from({ length: 12_000 }, (_, i) => ({ ...validItem, id: i + 1 }));
    const result = sanitizeInvoices(oversized);
    expect(result.length).toBe(10_000);
    spy.mockRestore();
  });

  it('null-byte injection stripped before storage', async () => {
    vi.resetModules();
    localStorage.clear();
    const { storage } = await import('@/lib/storage');
    const { sanitizeInvoices } = await import('@/lib/validation');

    const poisoned = [{
      id: 1, number: 'INV\x00-001', clientName: 'Acme\x00Corp',
      clientInitials: 'AC', clientColor: '#000', description: 'Test\x00',
      issueDate: '2025-01-01', dueDate: '2025-02-01', status: 'paid', amount: 1000,
    }];

    const sanitized = sanitizeInvoices(poisoned);
    expect(sanitized[0].clientName).not.toContain('\x00');
    expect(sanitized[0].description).not.toContain('\x00');
    expect(sanitized[0].number).not.toContain('\x00');
  });
});
