import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY_STORE = 'lx_enc_key_set';
const SALT = 'LedgerX-v1-salt';

/**
 * Encrypted localStorage service.
 *
 * Wraps `localStorage` with optional AES-256 encryption so sensitive
 * financial data is protected at rest.
 */
class StorageService {
  private encryptionKey: string | null = null;

  isEncryptionSetup(): boolean {
    return localStorage.getItem(ENCRYPTION_KEY_STORE) === '1';
  }

  setupEncryption(passcode: string): void {
    this.encryptionKey = CryptoJS.PBKDF2(passcode, SALT, { keySize: 256 / 32, iterations: 1000 }).toString();
    localStorage.setItem(ENCRYPTION_KEY_STORE, '1');
    localStorage.setItem('lx_enc_verify', this.encrypt('ledgerx-verify'));
  }

  unlock(passcode: string): boolean {
    const key = CryptoJS.PBKDF2(passcode, SALT, { keySize: 256 / 32, iterations: 1000 }).toString();
    const verify = localStorage.getItem('lx_enc_verify');
    if (!verify) return false;
    try {
      const bytes = CryptoJS.AES.decrypt(verify, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (decrypted === 'ledgerx-verify') {
        this.encryptionKey = key;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  isUnlocked(): boolean {
    return this.encryptionKey !== null || !this.isEncryptionSetup();
  }

  private encrypt(data: string): string {
    if (!this.encryptionKey) return data;
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }

  private decrypt(data: string): string {
    if (!this.encryptionKey) return data;
    try {
      const bytes = CryptoJS.AES.decrypt(data, this.encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted || data;
    } catch {
      return data;
    }
  }

  save<T>(key: string, value: T): void {
    try {
      const json = JSON.stringify(value);
      const stored = this.isEncryptionSetup() && this.encryptionKey ? this.encrypt(json) : json;
      localStorage.setItem(key, stored);
    } catch { /* quota exceeded */ }
  }

  load<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      const json = this.isEncryptionSetup() && this.encryptionKey ? this.decrypt(raw) : raw;
      return JSON.parse(json);
    } catch {
      return defaultValue;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clearAll(): void {
    localStorage.clear();
  }

  clearAppData(): void {
    const profile = localStorage.getItem('lx_profile');
    const dark = localStorage.getItem('lx_dark');
    const encKey = localStorage.getItem(ENCRYPTION_KEY_STORE);
    const encVerify = localStorage.getItem('lx_enc_verify');
    localStorage.clear();
    if (profile) localStorage.setItem('lx_profile', profile);
    if (dark) localStorage.setItem('lx_dark', dark);
    if (encKey) localStorage.setItem(ENCRYPTION_KEY_STORE, encKey);
    if (encVerify) localStorage.setItem('lx_enc_verify', encVerify);
  }
}

export const storage = new StorageService();
