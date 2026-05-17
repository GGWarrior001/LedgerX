import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY_STORE = 'lx_enc_key_set';
const ENCRYPTION_VERIFY_STORE = 'lx_enc_verify';
const PBKDF2_ITERATIONS = import.meta.env.MODE === 'test' ? 1_000 : 120_000;
const APP_DATA_KEYS = [
  'lx_profile',
  'lx_settings',
  'lx_notifs',
  'lx_invoices',
  'lx_inv_id',
  'lx_expenses',
  'lx_exp_id',
  'lx_clients',
  'lx_cli_id',
  'lx_vendors',
  'lx_ven_id',
];

interface EncryptedEnvelope {
  __ledgerx_encrypted: true;
  v: 2;
  alg: 'AES-CryptoJS';
  ct: string;
}

interface EncryptionVerifier {
  v: 2;
  salt: string;
  iterations: number;
  verify: EncryptedEnvelope;
}

export class StorageLockedError extends Error {
  constructor(message = 'Encrypted storage is locked') {
    super(message);
    this.name = 'StorageLockedError';
  }
}

class StorageService {
  private encryptionKey: string | null = null;

  isEncryptionSetup(): boolean {
    return localStorage.getItem(ENCRYPTION_KEY_STORE) === '1';
  }

  setupEncryption(passcode: string): void {
    const existingSalt = this.getVerifier()?.salt;
    const salt = existingSalt ?? CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64);
    this.encryptionKey = this.deriveKey(passcode, salt, PBKDF2_ITERATIONS);
    localStorage.setItem(ENCRYPTION_KEY_STORE, '1');
    localStorage.setItem(ENCRYPTION_VERIFY_STORE, JSON.stringify({
      v: 2,
      salt,
      iterations: PBKDF2_ITERATIONS,
      verify: this.encrypt('ledgerx-verify'),
    } satisfies EncryptionVerifier));
    this.encryptLegacyPlaintextAppData();
  }

  unlock(passcode: string): boolean {
    const verifier = this.getVerifier();
    if (!verifier) return false;
    const key = this.deriveKey(passcode, verifier.salt, verifier.iterations);
    try {
      const bytes = CryptoJS.AES.decrypt(verifier.verify.ct, key);
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

  private deriveKey(passcode: string, salt: string, iterations: number): string {
    return CryptoJS.PBKDF2(passcode, salt, { keySize: 256 / 32, iterations }).toString();
  }

  private encrypt(data: string): EncryptedEnvelope {
    if (!this.encryptionKey) throw new StorageLockedError();
    return {
      __ledgerx_encrypted: true,
      v: 2,
      alg: 'AES-CryptoJS',
      ct: CryptoJS.AES.encrypt(data, this.encryptionKey).toString(),
    };
  }

  private decrypt(envelope: EncryptedEnvelope): string {
    if (!this.encryptionKey) throw new StorageLockedError();
    try {
      const bytes = CryptoJS.AES.decrypt(envelope.ct, this.encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) throw new Error('Unable to decrypt payload');
      return decrypted;
    } catch {
      throw new Error('Unable to decrypt payload');
    }
  }

  save<T>(key: string, value: T): void {
    const json = JSON.stringify(value);
    if (this.isEncryptionSetup() && !this.encryptionKey) {
      throw new StorageLockedError(`Refusing plaintext write to ${key} while encrypted storage is locked`);
    }
    const stored = this.isEncryptionSetup() ? JSON.stringify(this.encrypt(json)) : json;
    localStorage.setItem(key, stored);
  }

  load<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      const envelope = this.parseEncryptedEnvelope(raw);
      if (envelope) {
        const json = this.decrypt(envelope);
        return JSON.parse(json);
      }
      const json = raw;
      return JSON.parse(json);
    } catch (err) {
      if (err instanceof StorageLockedError) throw err;
      return defaultValue;
    }
  }

  exportData<T>(key: string, defaultValue: T): T {
    return this.load(key, defaultValue);
  }

  private parseEncryptedEnvelope(raw: string): EncryptedEnvelope | null {
    try {
      const parsed = JSON.parse(raw) as Partial<EncryptedEnvelope>;
      if (
        parsed &&
        parsed.__ledgerx_encrypted === true &&
        parsed.v === 2 &&
        parsed.alg === 'AES-CryptoJS' &&
        typeof parsed.ct === 'string'
      ) {
        return parsed as EncryptedEnvelope;
      }
    } catch {
      return null;
    }
    return null;
  }

  private getVerifier(): EncryptionVerifier | null {
    const raw = localStorage.getItem(ENCRYPTION_VERIFY_STORE);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<EncryptionVerifier>;
      if (
        parsed?.v === 2 &&
        typeof parsed.salt === 'string' &&
        typeof parsed.iterations === 'number' &&
        parsed.verify &&
        this.parseEncryptedEnvelope(JSON.stringify(parsed.verify))
      ) {
        return parsed as EncryptionVerifier;
      }
    } catch {
      return null;
    }
    return null;
  }

  private encryptLegacyPlaintextAppData(): void {
    APP_DATA_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw || this.parseEncryptedEnvelope(raw)) return;
      try {
        JSON.parse(raw);
        localStorage.setItem(key, JSON.stringify(this.encrypt(raw)));
      } catch {
        // Ignore non-JSON legacy values.
      }
    });
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clearEncryptionKey(): void {
    this.encryptionKey = null;
  }

  clearAll(): void {
    localStorage.clear();
  }

  clearAppData(): void {
    const profile = localStorage.getItem('lx_profile');
    const dark = localStorage.getItem('lx_dark');
    const encKey = localStorage.getItem(ENCRYPTION_KEY_STORE);
    const encVerify = localStorage.getItem(ENCRYPTION_VERIFY_STORE);
    localStorage.clear();
    if (profile) localStorage.setItem('lx_profile', profile);
    if (dark) localStorage.setItem('lx_dark', dark);
    if (encKey) localStorage.setItem(ENCRYPTION_KEY_STORE, encKey);
    if (encVerify) localStorage.setItem(ENCRYPTION_VERIFY_STORE, encVerify);
  }
}

export const storage = new StorageService();
