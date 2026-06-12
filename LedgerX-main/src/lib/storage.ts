/**
 * storage.ts – LedgerX encrypted local storage (HARDENED v4 + Worker)
 *
 * New in this revision:
 *   - PBKDF2 key derivation uses `deriveKeyOffThread()` (CryptoWorkerClient)
 *     so 210k iterations run in a Worker, keeping the main thread unblocked.
 *   - `cryptoWorker.terminate()` called from `secureWipe()` — Worker key
 *     cache is cleared along with localStorage on wipe.
 *   - All other behaviour identical to previous hardened version.
 *
 * Fallback: when Workers unavailable (jsdom / SSR) deriveKeyOffThread()
 * calls deriveKeyFromPasscode() inline — fully transparent to callers.
 */

import * as webCrypto from './webCrypto';
import { PBKDF2_ITERATIONS_V3, PBKDF2_ITERATIONS_V4, CRYPTO_VERSION } from './webCrypto';
import { deriveKeyOffThread, cryptoWorker } from '@/workers/cryptoWorkerClient';

const ENCRYPTION_KEY_STORE    = 'lx_enc_key_set';
const ENCRYPTION_VERIFY_STORE = 'lx_enc_verify';
const UNLOCK_ATTEMPT_STORE    = 'lx_unlock_attempts';

const PBKDF2_ITERATIONS =
  typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test'
    ? 1_000
    : PBKDF2_ITERATIONS_V4;

export const APP_DATA_KEYS = [
  'lx_profile', 'lx_settings', 'lx_notifs',
  'lx_invoices', 'lx_inv_id',
  'lx_expenses', 'lx_exp_id',
  'lx_clients',  'lx_cli_id',
  'lx_vendors',  'lx_ven_id',
] as const;

interface EncryptedEnvelopeV3 {
  __ledgerx_encrypted: true; v: 3; alg: 'AES-GCM';
  iv: string; ct: string; tag: string;
}
interface EncryptedEnvelopeV4 {
  __ledgerx_encrypted: true; v: 4; cv: typeof CRYPTO_VERSION; alg: 'AES-GCM';
  iv: string; ct: string; tag: string;
}
interface EncryptedEnvelopeV2 {
  __ledgerx_encrypted: true; v: 2; alg: 'AES-CryptoJS'; ct: string;
}
type EncryptedEnvelope = EncryptedEnvelopeV2 | EncryptedEnvelopeV3 | EncryptedEnvelopeV4;

interface EncryptionVerifier {
  v: 3 | 4; cv?: number;
  salt: string; iterations: number;
  verify: EncryptedEnvelopeV3 | EncryptedEnvelopeV4;
}
interface UnlockAttemptState { count: number; lockedUntil: number; }

export class StorageLockedError extends Error {
  constructor(msg = 'Encrypted storage is locked') { super(msg); this.name = 'StorageLockedError'; }
}
export class StorageDecryptionError extends Error {
  constructor(msg = 'Unable to decrypt payload') { super(msg); this.name = 'StorageDecryptionError'; }
}
export class StorageLockedOutError extends Error {
  readonly retryAfterMs: number;
  constructor(ms: number) {
    super(`Too many failed attempts. Try again in ${Math.ceil(ms / 1000)}s`);
    this.name = 'StorageLockedOutError'; this.retryAfterMs = ms;
  }
}

class StorageService {
  private encryptionKey:  CryptoKey | null = null;
  private encryptionMeta: { salt: Uint8Array; iterations: number } | null = null;

  isEncryptionSetup(): boolean { return localStorage.getItem(ENCRYPTION_KEY_STORE) === '1'; }
  isUnlocked(): boolean { return this.encryptionKey !== null || !this.isEncryptionSetup(); }

  loadSync<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      if (this.isLikelyEncryptedEnvelope(raw)) return defaultValue;
      return JSON.parse(raw) as T;
    } catch { return defaultValue; }
  }

  async load<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      const envelope = this.parseEnvelope(raw);
      if (envelope) {
        if (!this.encryptionKey) throw new StorageLockedError();
        if (envelope.v === 4 || envelope.v === 3) {
          const json = await this.decryptGCM(envelope as EncryptedEnvelopeV3 | EncryptedEnvelopeV4, this.encryptionKey);
          return JSON.parse(json) as T;
        }
        if (envelope.v === 2) {
          console.warn(`[storage] v2 envelope at "${key}" — see v2Migration.ts`);
          return defaultValue;
        }
      }
      return JSON.parse(raw) as T;
    } catch (err) {
      if (err instanceof StorageLockedError) throw err;
      return defaultValue;
    }
  }

  async save<T>(key: string, value: T): Promise<void> {
    const json = JSON.stringify(value);
    if (this.isEncryptionSetup() && !this.encryptionKey)
      throw new StorageLockedError(`Refusing plaintext write to ${key} while locked`);
    if (this.isEncryptionSetup() && this.encryptionKey) {
      localStorage.setItem(key, JSON.stringify(await this.encryptV4(json)));
    } else {
      localStorage.setItem(key, json);
    }
  }

  async exportData<T>(key: string, def: T): Promise<T> { return this.load(key, def); }
  remove(key: string): void { localStorage.removeItem(key); }
  clearEncryptionKey(): void { this.encryptionKey = null; this.encryptionMeta = null; }
  clearAll(): void { localStorage.clear(); }

  clearAppData(): void {
    const keep: Record<string, string | null> = {
      lx_profile: localStorage.getItem('lx_profile'),
      lx_dark:    localStorage.getItem('lx_dark'),
      [ENCRYPTION_KEY_STORE]:    localStorage.getItem(ENCRYPTION_KEY_STORE),
      [ENCRYPTION_VERIFY_STORE]: localStorage.getItem(ENCRYPTION_VERIFY_STORE),
    };
    localStorage.clear();
    for (const [k, v] of Object.entries(keep)) if (v !== null) localStorage.setItem(k, v);
  }

  async setupEncryption(passcode: string): Promise<void> {
    const salt = webCrypto.generateSalt();
    const key  = await deriveKeyOffThread(passcode, salt, { iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' });
    this.encryptionKey = key;
    this.encryptionMeta = { salt, iterations: PBKDF2_ITERATIONS };
    localStorage.setItem(ENCRYPTION_KEY_STORE, '1');
    await this.writeVerifier(salt, PBKDF2_ITERATIONS);
    await this.encryptLegacyPlaintext();
  }

  async unlock(passcode: string): Promise<boolean> {
    this.checkLockout();
    const verifier = await this.readVerifier();
    if (!verifier) return false;
    try {
      const salt       = webCrypto.decodeBase64(verifier.salt);
      const iterations = verifier.iterations ?? PBKDF2_ITERATIONS_V3;
      const key        = await deriveKeyOffThread(passcode, salt, { iterations, hash: 'SHA-256' });
      const verified   = await this.decryptGCM(verifier.verify as EncryptedEnvelopeV3 | EncryptedEnvelopeV4, key);
      if (verified === 'ledgerx-verify') {
        this.encryptionKey  = key;
        this.encryptionMeta = { salt, iterations };
        this.clearLockoutState();
        this.runV2Migration();
        return true;
      }
      this.recordFailedAttempt(); return false;
    } catch { this.recordFailedAttempt(); return false; }
  }

  async changePasscode(oldPasscode: string, newPasscode: string): Promise<void> {
    if (!this.encryptionKey) throw new StorageLockedError();
    if (!await this.unlock(oldPasscode)) throw new Error('Old passcode is incorrect');

    const backup: Record<string, string | null> = {};
    for (const key of APP_DATA_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const env = this.parseEnvelope(raw);
        if (env && (env.v === 3 || env.v === 4))
          backup[key] = await this.decryptGCM(env as EncryptedEnvelopeV3 | EncryptedEnvelopeV4, this.encryptionKey!);
        else if (!env) backup[key] = raw;
      } catch { /* skip */ }
    }

    const newSalt = webCrypto.generateSalt();
    const newKey  = await deriveKeyOffThread(newPasscode, newSalt, { iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' });
    this.encryptionKey  = newKey;
    this.encryptionMeta = { salt: newSalt, iterations: PBKDF2_ITERATIONS };

    for (const [key, pt] of Object.entries(backup)) {
      if (!pt) continue;
      try { localStorage.setItem(key, JSON.stringify(await this.encryptV4(pt))); }
      catch (e) { console.error(`[storage] Re-encrypt failed for ${key}:`, e); }
    }
    await this.writeVerifier(newSalt, PBKDF2_ITERATIONS);
    this.clearLockoutState();
  }

  async secureWipe(): Promise<void> {
    for (const key of APP_DATA_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          localStorage.setItem(key, webCrypto.encodeBase64(webCrypto.generateSecureRandom(raw.length)));
        }
        localStorage.removeItem(key);
      } catch { localStorage.removeItem(key); }
    }
    localStorage.removeItem(ENCRYPTION_KEY_STORE);
    localStorage.removeItem(ENCRYPTION_VERIFY_STORE);
    localStorage.removeItem(UNLOCK_ATTEMPT_STORE);
    this.encryptionKey  = null;
    this.encryptionMeta = null;
    cryptoWorker.terminate();
  }

  getFailedAttemptCount(): number { return this.loadAttempts().count; }
  getLockoutRemainingMs(): number {
    const s = this.loadAttempts();
    return s.lockedUntil === 0 ? 0 : Math.max(0, s.lockedUntil - Date.now());
  }

  private checkLockout(): void {
    const r = this.getLockoutRemainingMs();
    if (r > 0) throw new StorageLockedOutError(r);
  }
  private recordFailedAttempt(): void {
    const s = this.loadAttempts(); s.count++;
    s.lockedUntil = s.count >= 5 ? Date.now() + Math.min(Math.pow(2, s.count - 4), 1800) * 1000 : 0;
    localStorage.setItem(UNLOCK_ATTEMPT_STORE, JSON.stringify(s));
  }
  private clearLockoutState(): void { localStorage.removeItem(UNLOCK_ATTEMPT_STORE); }
  private loadAttempts(): UnlockAttemptState {
    try { return JSON.parse(localStorage.getItem(UNLOCK_ATTEMPT_STORE) ?? '{}') as UnlockAttemptState; }
    catch { return { count: 0, lockedUntil: 0 }; }
  }

  private async encryptV4(pt: string): Promise<EncryptedEnvelopeV4> {
    if (!this.encryptionKey) throw new StorageLockedError();
    const iv = webCrypto.generateIV();
    const { ciphertext, tag } = await webCrypto.encryptAES_GCM(pt, this.encryptionKey, iv);
    return {
      __ledgerx_encrypted: true, v: 4, cv: CRYPTO_VERSION, alg: 'AES-GCM',
      iv:  webCrypto.encodeBase64(iv),
      ct:  webCrypto.encodeBase64(ciphertext),
      tag: webCrypto.encodeBase64(tag),
    };
  }

  private async decryptGCM(env: EncryptedEnvelopeV3 | EncryptedEnvelopeV4, key: CryptoKey): Promise<string> {
    try {
      return await webCrypto.decryptAES_GCM(
        webCrypto.decodeBase64(env.ct), webCrypto.decodeBase64(env.tag), key, webCrypto.decodeBase64(env.iv)
      );
    } catch (err) {
      throw new StorageDecryptionError(`v${env.v}: ${err instanceof Error ? err.message : err}`);
    }
  }

  private parseEnvelope(raw: string): EncryptedEnvelope | null {
    try {
      const p = JSON.parse(raw) as Partial<EncryptedEnvelope>;
      if (!p || p.__ledgerx_encrypted !== true) return null;
      if (p.v === 4) { const e = p as Partial<EncryptedEnvelopeV4>; if (e.alg === 'AES-GCM' && e.iv && e.ct && e.tag) return p as EncryptedEnvelopeV4; }
      if (p.v === 3) { const e = p as Partial<EncryptedEnvelopeV3>; if (e.alg === 'AES-GCM' && e.iv && e.ct && e.tag) return p as EncryptedEnvelopeV3; }
      if (p.v === 2) { const e = p as Partial<EncryptedEnvelopeV2>; if (e.alg === 'AES-CryptoJS' && e.ct) return p as EncryptedEnvelopeV2; }
    } catch { /* not JSON */ }
    return null;
  }

  private isLikelyEncryptedEnvelope(raw: string): boolean {
    return raw.includes('__ledgerx_encrypted') && raw.includes('"v":');
  }

  private async readVerifier(): Promise<EncryptionVerifier | null> {
    try {
      const raw = localStorage.getItem(ENCRYPTION_VERIFY_STORE);
      if (!raw) return null;
      const p = JSON.parse(raw) as Partial<EncryptionVerifier>;
      if ((p?.v === 3 || p?.v === 4) && typeof p.salt === 'string' && typeof p.iterations === 'number' && p.verify)
        return p as EncryptionVerifier;
    } catch { /* invalid */ }
    return null;
  }

  private async writeVerifier(salt: Uint8Array, iterations: number): Promise<void> {
    const v: EncryptionVerifier = {
      v: 4, cv: CRYPTO_VERSION,
      salt:       webCrypto.encodeBase64(salt),
      iterations,
      verify:     await this.encryptV4('ledgerx-verify'),
    };
    localStorage.setItem(ENCRYPTION_VERIFY_STORE, JSON.stringify(v));
  }

  private async encryptLegacyPlaintext(): Promise<void> {
    if (!this.isEncryptionSetup() || !this.encryptionKey) return;
    for (const key of APP_DATA_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw || this.parseEnvelope(raw)) continue;
      try { localStorage.setItem(key, JSON.stringify(await this.encryptV4(raw))); }
      catch { /* not valid JSON */ }
    }
  }

  private runV2Migration(): void {
    for (const key of APP_DATA_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const env = this.parseEnvelope(raw);
        if (env?.v === 2) console.warn(`[storage] v2 at "${key}" — see src/lib/v2Migration.ts`);
      } catch { /* ignore */ }
    }
  }
}

export const storage = new StorageService();
