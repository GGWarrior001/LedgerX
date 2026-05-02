/**
 * src/test/storage.test.ts
 *
 * Phase 4 — Encryption, unlock, and fallback tests for src/lib/storage.ts
 *
 * Coverage targets:
 *   - setup → unlock → save → load → lock → load fails
 *   - invalid passcode returns false
 *   - fallback to plaintext when encryption is disabled
 */
import { describe, it, expect, beforeEach } from 'vitest';

// StorageService is a singleton; we test via the exported `storage` instance.
// We re-require it for each test to get a fresh localStorage state.

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    // Re-create the module instance by invalidating its state
    // (localStorage.clear() resets all persisted flags)
  });

  it('returns false when no encryption is set up', async () => {
    // Dynamic import to get a fresh instance after localStorage.clear()
    const { storage } = await import('@/lib/storage');
    expect(storage.isEncryptionSetup()).toBe(false);
  });

  it('sets up encryption and marks as setup', async () => {
    const { storage } = await import('@/lib/storage');
    storage.setupEncryption('mySecurePasscode123');
    expect(storage.isEncryptionSetup()).toBe(true);
  });

  it('unlock succeeds with correct passcode', async () => {
    const { storage } = await import('@/lib/storage');
    storage.setupEncryption('mySecurePasscode123');
    // clearEncryptionKey simulates a lock
    storage.clearEncryptionKey();
    const result = storage.unlock('mySecurePasscode123');
    expect(result).toBe(true);
  });

  it('unlock returns false for invalid passcode', async () => {
    const { storage } = await import('@/lib/storage');
    storage.setupEncryption('mySecurePasscode123');
    storage.clearEncryptionKey();
    const result = storage.unlock('wrongpassword');
    expect(result).toBe(false);
  });

  it('save → load cycle works after setup and unlock', async () => {
    const { storage } = await import('@/lib/storage');
    storage.setupEncryption('mySecurePasscode123');

    const testData = { invoices: [{ id: 1, amount: 1000 }] };
    storage.save('lx_test_data', testData);

    const loaded = storage.load<typeof testData>('lx_test_data', { invoices: [] });
    expect(loaded.invoices).toHaveLength(1);
    expect(loaded.invoices[0].amount).toBe(1000);
  });

  it('load returns default value when key does not exist', async () => {
    const { storage } = await import('@/lib/storage');
    const result = storage.load<string[]>('lx_nonexistent', []);
    expect(result).toEqual([]);
  });

  it('data is not readable after key is cleared (lock)', async () => {
    const { storage } = await import('@/lib/storage');
    storage.setupEncryption('mySecurePasscode123');
    storage.save('lx_sensitive', { secret: 'value' });

    // Simulate locking: clear the in-memory key
    storage.clearEncryptionKey();

    // After locking, load should return the default (encrypted blob cannot be parsed)
    const result = storage.load<{ secret: string }>('lx_sensitive', { secret: '' });
    // When locked, decrypt returns the raw encrypted string, JSON.parse throws, falls back to default
    expect(result.secret).toBe('');
  });

  it('plaintext fallback when encryption is not enabled', async () => {
    const { storage } = await import('@/lib/storage');
    // No encryption setup
    expect(storage.isEncryptionSetup()).toBe(false);

    storage.save('lx_plain', { value: 42 });
    const result = storage.load<{ value: number }>('lx_plain', { value: 0 });
    expect(result.value).toBe(42);

    // Verify it's stored as plain JSON in localStorage
    const raw = localStorage.getItem('lx_plain');
    expect(raw).toBe(JSON.stringify({ value: 42 }));
  });
});
