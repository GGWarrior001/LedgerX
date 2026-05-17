import { beforeEach, describe, expect, it, vi } from 'vitest';

async function freshStorage() {
  vi.resetModules();
  return import('@/lib/storage');
}

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('returns false when no encryption is set up', async () => {
    const { storage } = await freshStorage();
    expect(storage.isEncryptionSetup()).toBe(false);
  });

  it('sets up encryption and marks as setup', async () => {
    const { storage } = await freshStorage();
    storage.setupEncryption('mySecurePasscode123');
    expect(storage.isEncryptionSetup()).toBe(true);
  });

  it('unlock succeeds with correct passcode', async () => {
    const { storage } = await freshStorage();
    storage.setupEncryption('mySecurePasscode123');
    storage.clearEncryptionKey();
    expect(storage.unlock('mySecurePasscode123')).toBe(true);
  });

  it('unlock returns false for invalid passcode', async () => {
    const { storage } = await freshStorage();
    storage.setupEncryption('mySecurePasscode123');
    storage.clearEncryptionKey();
    expect(storage.unlock('wrongpassword')).toBe(false);
  });

  it('save and load cycle works after setup and unlock', async () => {
    const { storage } = await freshStorage();
    storage.setupEncryption('mySecurePasscode123');

    const testData = { invoices: [{ id: 1, amount: 1000 }] };
    storage.save('lx_test_data', testData);

    const raw = localStorage.getItem('lx_test_data') ?? '';
    expect(raw).toContain('__ledgerx_encrypted');
    expect(raw).not.toContain('1000');

    const loaded = storage.load<typeof testData>('lx_test_data', { invoices: [] });
    expect(loaded.invoices).toHaveLength(1);
    expect(loaded.invoices[0].amount).toBe(1000);
  });

  it('load returns default value when key does not exist', async () => {
    const { storage } = await freshStorage();
    expect(storage.load<string[]>('lx_nonexistent', [])).toEqual([]);
  });

  it('does not write plaintext while encrypted storage is locked', async () => {
    const { storage } = await freshStorage();
    storage.setupEncryption('mySecurePasscode123');
    storage.save('lx_sensitive', { secret: 'value' });
    const encryptedRaw = localStorage.getItem('lx_sensitive');

    storage.clearEncryptionKey();
    expect(() => storage.save('lx_sensitive', { secret: 'new value' })).toThrow('Refusing plaintext write');
    expect(localStorage.getItem('lx_sensitive')).toBe(encryptedRaw);
    expect(localStorage.getItem('lx_sensitive')).not.toContain('new value');
  });

  it('preserves encrypted data across lock and unlock', async () => {
    const { storage } = await freshStorage();
    storage.setupEncryption('mySecurePasscode123');
    storage.save('lx_sensitive', { secret: 'value' });

    storage.clearEncryptionKey();
    expect(() => storage.load('lx_sensitive', { secret: '' })).toThrow('Encrypted storage is locked');

    expect(storage.unlock('mySecurePasscode123')).toBe(true);
    expect(storage.load('lx_sensitive', { secret: '' })).toEqual({ secret: 'value' });
  });

  it('does not overwrite encrypted profile defaults during locked app boot', async () => {
    let module = await freshStorage();
    module.storage.save('lx_profile', { name: 'Asha', role: 'Admin', city: 'Pune', businessName: 'Asha Co', fiscalYear: 'Apr-Mar', currency: '₹', dataChoice: 'fresh' });
    module.storage.setupEncryption('mySecurePasscode123');
    module.storage.clearEncryptionKey();
    const encryptedProfile = localStorage.getItem('lx_profile');

    vi.resetModules();
    const { useAppStore } = await import('@/shared/stores/useAppStore');
    expect(useAppStore.getState().locked).toBe(true);
    useAppStore.getState().ensureProfile();

    expect(localStorage.getItem('lx_profile')).toBe(encryptedProfile);

    module = await import('@/lib/storage');
    expect(module.storage.unlock('mySecurePasscode123')).toBe(true);
    expect(module.storage.load('lx_profile', null)).toMatchObject({ name: 'Asha' });
  });

  it('plaintext fallback works when encryption is not enabled', async () => {
    const { storage } = await freshStorage();
    expect(storage.isEncryptionSetup()).toBe(false);

    storage.save('lx_plain', { value: 42 });
    expect(storage.load<{ value: number }>('lx_plain', { value: 0 }).value).toBe(42);
    expect(localStorage.getItem('lx_plain')).toBe(JSON.stringify({ value: 42 }));
  });
});
