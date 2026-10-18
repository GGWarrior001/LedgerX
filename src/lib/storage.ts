/**
 * Storage Service – Encrypted local storage with WebCrypto
 *
 * Provides encrypted key-value storage for LedgerX with:
 * - AES-GCM authenticated encryption (v3 format)
 * - PBKDF2-SHA256 key derivation (120k iterations)
 * - Backward compatibility with legacy AES-ECB (v2 format)
 * - Async-first design to prevent UI blocking
 * - Automatic v2→v3 re-encryption on unlock
 *
 * All encryption operations are async to allow the system to handle
 * expensive key derivation (PBKDF2 is intentionally slow for security).
 */

import * as webCrypto from './webCrypto';

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

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Version 2 envelope (legacy AES-ECB format - read-only after migration).
 */
interface EncryptedEnvelopeV2 {
  __ledgerx_encrypted: true;
  v: 2;
  alg: 'AES-CryptoJS';
  ct: string;
}

/**
 * Version 3 envelope (current AES-GCM format with WebCrypto).
 */
interface EncryptedEnvelopeV3 {
  __ledgerx_encrypted: true;
  v: 3;
  alg: 'AES-GCM';
  iv: string; // base64
  ct: string; // base64
  tag: string; // base64
}

/** Union type for all supported encrypted envelope versions. */
type EncryptedEnvelope = EncryptedEnvelopeV2 | EncryptedEnvelopeV3;

/**
 * Encryption verifier for password validation.
 */
interface EncryptionVerifier {
  v: 3;
  salt: string; // base64
  iterations: number;
  verify: EncryptedEnvelopeV3;
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when attempting to access encrypted storage while locked.
 */
export class StorageLockedError extends Error {
  constructor(message = 'Encrypted storage is locked') {
    super(message);
    this.name = 'StorageLockedError';
  }
}

/**
 * Thrown when encryption/decryption fails (data corruption detected).
 */
export class StorageDecryptionError extends Error {
  constructor(message = 'Unable to decrypt payload') {
    super(message);
    this.name = 'StorageDecryptionError';
  }
}

/**
 * Thrown when stored data uses an encryption format that cannot be decrypted
 * with the current code. User action required: export from an older version
 * or reset the app. Original stored bytes are never modified by this error path.
 */
export class MigrationRequiredError extends Error {
  constructor(message = 'Stored data uses a legacy encryption format that cannot be read') {
    super(message);
    this.name = 'MigrationRequiredError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Service
// ─────────────────────────────────────────────────────────────────────────────

class StorageService {
  /** Derived encryption key (null when locked). */
  private encryptionKey: CryptoKey | null = null;

  /** Encryption metadata (salt, iterations). */
  private encryptionMeta: { salt: Uint8Array; iterations: number } | null = null;

  /** When true, all writes are blocked until the user resets the app. */
  private _recoveryRequired: boolean = false;

  /**
   * Checks if encryption is set up.
   */
  isEncryptionSetup(): boolean {
    return localStorage.getItem(ENCRYPTION_KEY_STORE) === '1';
  }

  /**
   * Sets up encryption with a passcode.
   *
   * Creates verifier envelope to validate passcode on unlock.
   * Automatically re-encrypts any unencrypted data in APP_DATA_KEYS.
   *
   * @param passcode User-provided encryption passcode
   * @throws If encryption setup fails
   */
  async setupEncryption(passcode: string): Promise<void> {
    // Use existing salt if available, otherwise generate new one
    const existingSalt = await this.getVerifierAsync().then((v) => v?.salt);
    const salt = existingSalt ? webCrypto.decodeBase64(existingSalt) : webCrypto.generateSalt();

    // Derive key from passcode
    const key = await webCrypto.deriveKeyFromPasscode(passcode, salt, {
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    });

    this.encryptionKey = key;
    this.encryptionMeta = { salt, iterations: PBKDF2_ITERATIONS };

    // Mark encryption as setup
    localStorage.setItem(ENCRYPTION_KEY_STORE, '1');

    // Create verifier envelope
    const verifyString = 'ledgerx-verify';
    const verifyEnvelope = await this.encryptToV3(verifyString);

    const verifier: EncryptionVerifier = {
      v: 3,
      salt: webCrypto.encodeBase64(salt),
      iterations: PBKDF2_ITERATIONS,
      verify: verifyEnvelope,
    };

    localStorage.setItem(ENCRYPTION_VERIFY_STORE, JSON.stringify(verifier));

    // Migrate any legacy plaintext data
    await this.encryptLegacyPlaintextAppData();
  }

  /**
   * Unlocks encrypted storage with a passcode.
   *
   * @param passcode User-provided encryption passcode
   * @returns true if passcode correct and storage unlocked, false otherwise
   */
  async unlock(passcode: string): Promise<boolean> {
    const verifier = await this.getVerifierAsync();
    if (!verifier) return false;

    try {
      // Derive key with stored salt and iterations
      const salt = webCrypto.decodeBase64(verifier.salt);
      const key = await webCrypto.deriveKeyFromPasscode(passcode, salt, {
        iterations: verifier.iterations,
        hash: 'SHA-256',
      });

      // Try to decrypt verifier to confirm passcode is correct
      const verified = await this.decryptFromV3(verifier.verify, key);
      if (verified === 'ledgerx-verify') {
        this.encryptionKey = key;
        this.encryptionMeta = { salt, iterations: verifier.iterations };

        // Detect v2 legacy data after successful unlock. Detection-only:
        // never decrypts, never modifies stored bytes. Sets recovery state
        // so normal writes are blocked until the user resets.
        const { count } = this.detectV2Legacy();
        if (count > 0) this._recoveryRequired = true;

        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  /**
   * Checks if storage is unlocked.
   */
  isUnlocked(): boolean {
    return this.encryptionKey !== null || !this.isEncryptionSetup();
  }

  /**
   * Saves encrypted data to localStorage.
   *
   * @param key Storage key
   * @param value Data to store (will be JSON stringified and encrypted)
   * @throws StorageLockedError if encryption setup but not unlocked
   */
  async save<T>(key: string, value: T): Promise<void> {
    this.requireNotInRecovery();
    const json = JSON.stringify(value);

    if (this.isEncryptionSetup() && !this.encryptionKey) {
      throw new StorageLockedError(
        `Refusing plaintext write to ${key} while encrypted storage is locked`
      );
    }

    if (this.isEncryptionSetup()) {
      const envelope = await this.encryptToV3(json);
      localStorage.setItem(key, JSON.stringify(envelope));
    } else {
      localStorage.setItem(key, json);
    }
  }

  /**
   * Loads encrypted data from localStorage.
   *
   * Supports both v2 (legacy) and v3 (current) envelopes.
   * Returns default value if key not found or decryption fails.
   *
   * @param key Storage key
   * @param defaultValue Default value if key not found
   * @returns Decrypted and parsed value, or defaultValue
   * @throws StorageLockedError if encrypted storage is locked
   */
  async load<T>(key: string, defaultValue: T): Promise<T> {
    try {
      if (this.isEncryptionSetup() && !this.encryptionKey) {
        throw new StorageLockedError();
      }

      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;

      if (raw === 'undefined') return undefined as T;

      const hasEncryptionMarker = this.hasEncryptionMarker(raw);
      const envelope = this.parseEncryptedEnvelope(raw);
      if (hasEncryptionMarker && !envelope) {
        throw new StorageDecryptionError('Malformed encrypted envelope');
      }

      if (envelope) {
        // v3 envelope (current AES-GCM)
        if (envelope.v === 3) {
          const json = await this.decryptFromV3(envelope as EncryptedEnvelopeV3, this.encryptionKey!);
          return JSON.parse(json);
        }

        // v2 envelope (legacy CryptoJS) — unsupported, never decrypt, never discard silently
        if (envelope.v === 2) {
          throw new MigrationRequiredError(
            `Stored data at "${key}" uses legacy v2 encryption and cannot be decrypted`,
          );
        }
      }

      // Not an encrypted envelope - try to parse as plaintext
      try {
        return JSON.parse(raw);
      } catch {
        // Malformed plaintext JSON - return default value instead of throwing
        return defaultValue;
      }
    } catch (err) {
      if (
        err instanceof StorageLockedError ||
        err instanceof StorageDecryptionError ||
        err instanceof MigrationRequiredError
      ) {
        throw err;
      }
      return defaultValue;
    }
  }

  /**
   * Exports data (used by export feature).
   * Same as load() but may apply special handling in future.
   */
  async exportData<T>(key: string, defaultValue: T): Promise<T> {
    return this.load(key, defaultValue);
  }

  /**
   * Removes a key from storage.
   */
  remove(key: string): void {
    this.requireNotInRecovery();
    localStorage.removeItem(key);
  }

  /**
   * Clears the in-memory encryption key (locks storage).
   */
  clearEncryptionKey(): void {
    this.encryptionKey = null;
    this.encryptionMeta = null;
  }

  /**
   * Clears all localStorage.
   */
  clearAll(): void {
    localStorage.clear();
    // After a full clear, no v2 data remains — recovery state is resolved.
    this._recoveryRequired = false;
  }

  /**
   * Clears app data while preserving encryption settings.
   */
  clearAppData(): void {
    const dark = localStorage.getItem('lx_dark');
    const encKey = localStorage.getItem(ENCRYPTION_KEY_STORE);
    const encVerify = localStorage.getItem(ENCRYPTION_VERIFY_STORE);

    localStorage.clear();

    if (dark) localStorage.setItem('lx_dark', dark);
    if (encKey) localStorage.setItem(ENCRYPTION_KEY_STORE, encKey);
    if (encVerify) localStorage.setItem(ENCRYPTION_VERIFY_STORE, encVerify);

    // After clearing app data, no v2 data remains — recovery state is resolved.
    this._recoveryRequired = false;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Encrypts plaintext to v3 envelope (WebCrypto AES-GCM).
   */
  private async encryptToV3(plaintext: string): Promise<EncryptedEnvelopeV3> {
    if (!this.encryptionKey || !this.encryptionMeta) {
      throw new StorageLockedError();
    }

    const iv = webCrypto.generateIV();
    const { ciphertext, tag } = await webCrypto.encryptAES_GCM(plaintext, this.encryptionKey, iv);

    return {
      __ledgerx_encrypted: true,
      v: 3,
      alg: 'AES-GCM',
      iv: webCrypto.encodeBase64(iv),
      ct: webCrypto.encodeBase64(ciphertext),
      tag: webCrypto.encodeBase64(tag),
    };
  }

  /**
   * Decrypts v3 envelope (WebCrypto AES-GCM).
   */
  private async decryptFromV3(
    envelope: EncryptedEnvelopeV3,
    key: CryptoKey
  ): Promise<string> {
    try {
      const iv = webCrypto.decodeBase64(envelope.iv);
      const ciphertext = webCrypto.decodeBase64(envelope.ct);
      const tag = webCrypto.decodeBase64(envelope.tag);

      return await webCrypto.decryptAES_GCM(ciphertext, tag, key, iv);
    } catch (err) {
      throw new StorageDecryptionError(
        `Failed to decrypt v3 payload: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Parses a string as an encrypted envelope (v2 or v3).
   */
  private parseEncryptedEnvelope(raw: string): EncryptedEnvelope | null {
    try {
      const parsed = JSON.parse(raw) as Partial<EncryptedEnvelope>;

      if (!parsed || parsed.__ledgerx_encrypted !== true) {
        return null;
      }

      if (parsed.v === 3) {
        if (
          parsed.alg === 'AES-GCM' &&
          typeof parsed.iv === 'string' &&
          typeof parsed.ct === 'string' &&
          typeof parsed.tag === 'string'
        ) {
          return parsed as EncryptedEnvelopeV3;
        }
      }

      if (parsed.v === 2) {
        if (parsed.alg === 'AES-CryptoJS' && typeof parsed.ct === 'string') {
          return parsed as EncryptedEnvelopeV2;
        }
      }
    } catch {
      // Not JSON - not an envelope
    }

    return null;
  }

  /**
   * Detects if payload claims to be an encrypted LedgerX envelope.
   */
  private hasEncryptionMarker(raw: string): boolean {
    try {
      const parsed = JSON.parse(raw) as { __ledgerx_encrypted?: unknown };
      return parsed?.__ledgerx_encrypted === true;
    } catch {
      return false;
    }
  }

  /**
   * Gets verifier envelope (for password validation).
   */
  private async getVerifierAsync(): Promise<EncryptionVerifier | null> {
    const raw = localStorage.getItem(ENCRYPTION_VERIFY_STORE);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Partial<EncryptionVerifier>;

      if (
        parsed?.v === 3 &&
        typeof parsed.salt === 'string' &&
        typeof parsed.iterations === 'number' &&
        parsed.verify
      ) {
        return parsed as EncryptionVerifier;
      }
    } catch {
      // Invalid format
    }

    return null;
  }

  /**
   * Automatically encrypts any legacy plaintext app data (one-time migration).
   */
  private async encryptLegacyPlaintextAppData(): Promise<void> {
    if (!this.isEncryptionSetup() || !this.encryptionKey) return;

    for (const key of APP_DATA_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      // Skip if already encrypted
      if (this.parseEncryptedEnvelope(raw)) continue;

      try {
        // Validate JSON
        JSON.parse(raw);
        // Encrypt and re-store
        const envelope = await this.encryptToV3(raw);
        localStorage.setItem(key, JSON.stringify(envelope));
      } catch {
        // Not valid JSON, skip
      }
    }
  }

  /**
   * Detects all v2 (legacy CryptoJS) envelopes across every known encrypted data key,
   * including APP_DATA_KEYS and 'lx_local_user'. Does not modify any stored bytes.
   */
  detectAllV2Keys(): string[] {
    const found: string[] = [];
    const keysToCheck = [...APP_DATA_KEYS, 'lx_local_user'];
    for (const key of keysToCheck) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const envelope = this.parseEncryptedEnvelope(raw);
        if (envelope && envelope.v === 2) found.push(key);
      } catch {
        // Ignore individual key read errors
      }
    }
    return found;
  }

  /**
   * Returns true if any v2 legacy envelope is present. Used to gate startup and writes.
   */
  recoveryRequired(): boolean {
    return this._recoveryRequired || this.detectAllV2Keys().length > 0;
  }

  /**
   * Internal write guard. Throws MigrationRequiredError if recovery is required,
   * preventing normal persistence while legacy data is unreadable.
   */
  private requireNotInRecovery(): void {
    if (this.recoveryRequired()) {
      throw new MigrationRequiredError(
        'Storage is in recovery state: legacy v2 data cannot be read. Reset the app before writing.',
      );
    }
  }

  /**
   * Replaces the former no-op migrateV2ToV3(). Detection-only: reports v2 keys,
   * never decrypts, never modifies stored bytes.
   */
  detectV2Legacy(): { keys: string[]; count: number } {
    const keys = this.detectAllV2Keys();
    if (keys.length > 0) {
      console.warn(`[storage] v2 legacy data detected at keys: ${keys.join(', ')} — recovery required`);
    }
    return { keys, count: keys.length };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────────────────────

export const storage = new StorageService();
