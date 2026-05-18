/**
 * WebCrypto – Modern cryptographic primitives for LedgerX
 *
 * Provides async-first encryption utilities using the Web Crypto API:
 * - PBKDF2-SHA256 for key derivation (120k iterations)
 * - AES-GCM for authenticated encryption with random IVs
 * - Secure random generation for cryptographic use
 *
 * All operations are intentionally async to prevent UI blocking and allow
 * cryptographic operations to run efficiently on the system.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of AES-GCM encryption containing ciphertext and authentication tag.
 */
export interface AES_GCM_EncryptResult {
  /** Raw ciphertext bytes (without auth tag). */
  ciphertext: Uint8Array;
  /** 128-bit authentication tag for integrity verification. */
  tag: Uint8Array;
}

/**
 * Configuration for PBKDF2 key derivation.
 */
export interface PBKDF2Config {
  /** Number of iterations (recommend 120,000+). */
  iterations: number;
  /** Hash algorithm ('SHA-256' or 'SHA-512'). */
  hash: 'SHA-256' | 'SHA-512';
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Default PBKDF2 configuration for LedgerX. */
const DEFAULT_PBKDF2_CONFIG: PBKDF2Config = {
  iterations: 120_000, // ~100ms on modern CPU
  hash: 'SHA-256',
};

/** AES-GCM IV size: 96 bits (12 bytes) is recommended for randomized generation. */
const IV_SIZE_BYTES = 12;

/** AES-GCM tag size: 128 bits (16 bytes) for maximum security. */
const TAG_SIZE_BITS = 128;

/** AES key size: 256 bits (32 bytes) for strong security. */
const KEY_SIZE_BITS = 256;

// ─────────────────────────────────────────────────────────────────────────────
// Cryptographically Secure Random Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates cryptographically secure random bytes.
 *
 * Uses the Web Crypto API's `crypto.getRandomValues()` which provides
 * CSPRNG (Cryptographically Secure Pseudo-Random Number Generator).
 *
 * @param bytes Number of random bytes to generate
 * @returns Uint8Array of random bytes
 * @throws If crypto.getRandomValues is not available
 *
 * @example
 * const salt = generateSecureRandom(16);
 * const iv = generateSecureRandom(12);
 */
export function generateSecureRandom(bytes: number): Uint8Array {
  if (bytes <= 0) throw new Error('bytes must be positive');
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return buffer;
}

/**
 * Generates a random IV for AES-GCM encryption (96 bits / 12 bytes).
 *
 * @returns 12-byte random IV suitable for AES-GCM
 *
 * @example
 * const iv = generateIV();
 * const { ciphertext, tag } = await encryptAES_GCM(data, key, iv);
 */
export function generateIV(): Uint8Array {
  return generateSecureRandom(IV_SIZE_BYTES);
}

/**
 * Generates a random salt for PBKDF2 key derivation (128 bits / 16 bytes).
 *
 * @returns 16-byte random salt
 *
 * @example
 * const salt = generateSalt();
 * const key = await deriveKeyFromPasscode('password', salt);
 */
export function generateSalt(): Uint8Array {
  return generateSecureRandom(16);
}

// ─────────────────────────────────────────────────────────────────────────────
// Key Derivation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derives an AES-GCM encryption key from a passcode using PBKDF2-SHA256.
 *
 * This is the standard NIST-recommended key derivation for password-based
 * encryption. The derived key is NOT extractable from the CryptoKey object
 * for security (can only be used for encryption/decryption operations).
 *
 * @param passcode User-provided passphrase
 * @param salt Random salt bytes (recommend 16 bytes minimum)
 * @param config PBKDF2 configuration (iterations, hash algorithm)
 * @returns CryptoKey suitable for AES-GCM operations
 *
 * @throws If WebCrypto API is unavailable or parameters are invalid
 *
 * @example
 * const salt = generateSalt();
 * const key = await deriveKeyFromPasscode('MyPassword123!', salt, {
 *   iterations: 120000,
 *   hash: 'SHA-256'
 * });
 */
export async function deriveKeyFromPasscode(
  passcode: string,
  salt: Uint8Array,
  config: PBKDF2Config = DEFAULT_PBKDF2_CONFIG
): Promise<CryptoKey> {
  if (!passcode || passcode.length === 0) {
    throw new Error('Passcode cannot be empty');
  }
  if (!salt || salt.length === 0) {
    throw new Error('Salt cannot be empty');
  }
  if (config.iterations < 1000) {
    throw new Error('PBKDF2 iterations must be at least 1000 (recommend 100k+)');
  }

  // Step 1: Import passcode as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passcode),
    'PBKDF2',
    false, // not extractable
    ['deriveBits']
  );

  // Step 2: Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: config.iterations,
      hash: config.hash,
    },
    keyMaterial,
    KEY_SIZE_BITS
  );

  // Step 3: Import derived bits as AES-GCM key
  const key = await crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: 'AES-GCM' },
    false, // not extractable
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Derives the same key from the same passcode+salt+iterations.
 *
 * This is deterministic: calling with identical parameters produces identical
 * cryptographic keys. This enables password-based decryption of old encrypted
 * data (e.g., v2 CryptoJS format → v3 WebCrypto format).
 *
 * @param passcode Same passcode used for encryption
 * @param salt Same salt used for encryption (usually stored with ciphertext)
 * @param iterations Same iteration count used for encryption
 * @returns CryptoKey for decryption
 *
 * @example
 * // Old encryption
 * const salt = generateSalt();
 * const key1 = await deriveKeyFromPasscode('pass123', salt);
 * const { ciphertext, tag } = await encryptAES_GCM(data, key1, iv);
 *
 * // Later decryption
 * const key2 = await deriveKeyFromPasscode('pass123', salt); // Same key
 * const plaintext = await decryptAES_GCM(ciphertext, tag, key2, iv);
 */
export async function deriveKeyDeterministic(
  passcode: string,
  salt: Uint8Array,
  iterations: number = DEFAULT_PBKDF2_CONFIG.iterations
): Promise<CryptoKey> {
  return deriveKeyFromPasscode(passcode, salt, {
    iterations,
    hash: 'SHA-256',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AES-GCM Encryption / Decryption
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encrypts plaintext using AES-256-GCM (authenticated encryption).
 *
 * AES-GCM (Galois/Counter Mode) provides:
 * - **Confidentiality:** AES encryption
 * - **Integrity:** Galois authentication tag (detects tampering)
 * - **Authenticity:** Can only be created with knowledge of the key
 *
 * Each encryption produces a unique ciphertext even for identical plaintext
 * (due to random IV). The authentication tag ensures any bit corruption is
 * detected during decryption.
 *
 * @param plaintext String to encrypt
 * @param key AES-GCM CryptoKey (from deriveKeyFromPasscode)
 * @param iv Initialization vector (recommend generateIV())
 * @returns {ciphertext, tag} Encrypted result with authentication tag
 * @throws If encryption fails or parameters are invalid
 *
 * @example
 * const plaintext = '{"amount": 1000}';
 * const key = await deriveKeyFromPasscode('pass', salt);
 * const iv = generateIV();
 * const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);
 *
 * // Store as: { iv: base64(iv), ct: base64(ciphertext), tag: base64(tag) }
 */
export async function encryptAES_GCM(
  plaintext: string,
  key: CryptoKey,
  iv: Uint8Array
): Promise<AES_GCM_EncryptResult> {
  if (!key) throw new Error('Key is required');
  if (!iv || iv.length !== IV_SIZE_BYTES) {
    throw new Error(`IV must be exactly ${IV_SIZE_BYTES} bytes`);
  }

  const plainBuffer = new TextEncoder().encode(plaintext);

  // GCM automatically generates and appends the auth tag
  // We need to extract the tag separately for storage
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plainBuffer
  );

  // WebCrypto appends tag to ciphertext. Extract them:
  // - Last 16 bytes = authentication tag
  // - Everything before = ciphertext
  const ciphertext = encrypted.slice(0, encrypted.byteLength - TAG_SIZE_BITS / 8);
  const tag = new Uint8Array(encrypted.slice(encrypted.byteLength - TAG_SIZE_BITS / 8));

  return { ciphertext, tag };
}

/**
 * Decrypts AES-GCM ciphertext with authentication tag verification.
 *
 * Verification happens automatically: if the authentication tag doesn't match,
 * decryption throws an error (indicating tampering or wrong key).
 *
 * @param ciphertext Encrypted bytes (without authentication tag)
 * @param tag 16-byte authentication tag from encryption
 * @param key Same AES-GCM CryptoKey used for encryption
 * @param iv Same IV used for encryption
 * @returns Decrypted plaintext as string
 * @throws If authentication tag verification fails (tampering detected)
 * @throws If key/IV mismatch or decryption fails
 *
 * @example
 * const plaintext = await decryptAES_GCM(ciphertext, tag, key, iv);
 * const data = JSON.parse(plaintext);
 */
export async function decryptAES_GCM(
  ciphertext: Uint8Array,
  tag: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  if (!key) throw new Error('Key is required');
  if (!iv || iv.length !== IV_SIZE_BYTES) {
    throw new Error(`IV must be exactly ${IV_SIZE_BYTES} bytes`);
  }
  if (!tag || tag.length !== TAG_SIZE_BITS / 8) {
    throw new Error(`Authentication tag must be exactly ${TAG_SIZE_BITS / 8} bytes`);
  }

  // Reconstruct the full encrypted buffer (ciphertext + tag)
  const encryptedBuffer = new Uint8Array(ciphertext.length + tag.length);
  encryptedBuffer.set(ciphertext, 0);
  encryptedBuffer.set(tag, ciphertext.length);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedBuffer
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    // WebCrypto throws OperationError for tag verification failure
    if (err instanceof Error && err.message.includes('verification')) {
      throw new Error('Authentication tag verification failed (data may be tampered)');
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Base64 Encoding / Decoding
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encodes Uint8Array to base64 string for JSON storage.
 *
 * Base64 encoding converts binary data to a safe text representation that
 * can be stored in JSON or transmitted over text-only protocols.
 *
 * @param buffer Binary data
 * @returns Base64-encoded string (URL-safe: - and _ instead of + and /)
 *
 * @example
 * const salt = generateSecureRandom(16);
 * const encoded = encodeBase64(salt); // "kR9u2v+n1p3q..."
 */
export function encodeBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decodes base64 string to Uint8Array.
 *
 * Inverse of encodeBase64(). Handles URL-safe base64 variant.
 *
 * @param base64 Base64-encoded string
 * @returns Decoded binary data
 * @throws If base64 string is invalid
 *
 * @example
 * const decoded = decodeBase64('kR9u2v-n1p3q'); // Uint8Array
 */
export function decodeBase64(base64: string): Uint8Array {
  // Convert URL-safe base64 to standard base64
  let standard = base64.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  while (standard.length % 4 !== 0) {
    standard += '=';
  }

  try {
    const binary = atob(standard);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    throw new Error('Invalid base64 string');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Export constants for testing
// ─────────────────────────────────────────────────────────────────────────────

/** Exported for testing/verification only. */
export const CRYPTO_CONSTANTS = {
  IV_SIZE_BYTES,
  TAG_SIZE_BITS,
  KEY_SIZE_BITS,
  DEFAULT_PBKDF2_CONFIG,
} as const;
