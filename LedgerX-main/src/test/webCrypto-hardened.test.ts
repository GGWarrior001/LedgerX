/**
 * webCrypto-hardened.test.ts – Test suite for hardened WebCrypto module (v4)
 *
 * New tests for v4 changes:
 *   - PBKDF2 iterations: PBKDF2_ITERATIONS_V4 = 210,000 (OWASP 2024)
 *   - Salt: 32 bytes (256-bit)
 *   - CRYPTO_VERSION = 4
 *   - encodeBase64 chunked implementation for large payloads
 *   - Cross-version key derivation (v3 salt re-used with v3 iterations)
 *
 * All existing tests from webCrypto.test.ts are preserved below.
 */

import { describe, it, expect } from 'vitest';
import {
  generateSecureRandom,
  generateIV,
  generateSalt,
  deriveKeyFromPasscode,
  deriveKeyDeterministic,
  encryptAES_GCM,
  decryptAES_GCM,
  encodeBase64,
  decodeBase64,
  CRYPTO_CONSTANTS,
  PBKDF2_ITERATIONS_V4,
  PBKDF2_ITERATIONS_V3,
  CRYPTO_VERSION,
} from './webCrypto';

// ─── v4 constants ─────────────────────────────────────────────────────────────

describe('v4 constants', () => {
  it('CRYPTO_VERSION is 4', () => {
    expect(CRYPTO_VERSION).toBe(4);
  });

  it('PBKDF2_ITERATIONS_V4 is 210,000 (OWASP 2024)', () => {
    expect(PBKDF2_ITERATIONS_V4).toBe(210_000);
  });

  it('PBKDF2_ITERATIONS_V3 is 120,000 (legacy compatibility)', () => {
    expect(PBKDF2_ITERATIONS_V3).toBe(120_000);
  });

  it('SALT_SIZE_BYTES is 32 (256-bit)', () => {
    expect(CRYPTO_CONSTANTS.SALT_SIZE_BYTES).toBe(32);
  });
});

// ─── Salt generation ──────────────────────────────────────────────────────────

describe('generateSalt – 256-bit (v4)', () => {
  it('generates 32-byte salt', () => {
    const salt = generateSalt();
    expect(salt.length).toBe(32);
  });

  it('generates different salts on each call', () => {
    const a = encodeBase64(generateSalt());
    const b = encodeBase64(generateSalt());
    expect(a).not.toBe(b);
  });

  it('all 32 bytes are populated (no zero padding)', () => {
    const salt = generateSalt();
    // Statistically, a CSPRNG-generated 32-byte salt should not be all zeros
    const allZero = salt.every(b => b === 0);
    expect(allZero).toBe(false);
  });
});

// ─── Key derivation ───────────────────────────────────────────────────────────

describe('deriveKeyFromPasscode', () => {
  it('derives a non-extractable CryptoKey', async () => {
    const salt = generateSalt();
    const key = await deriveKeyFromPasscode('TestPass123!', salt, {
      iterations: 1_000,
      hash: 'SHA-256',
    });
    expect(key.type).toBe('secret');
    expect(key.extractable).toBe(false);
    expect(key.algorithm.name).toBe('AES-GCM');
  });

  it('same passcode+salt+iterations → same effective key (round-trip)', async () => {
    const salt = generateSalt();
    const opts = { iterations: 1_000, hash: 'SHA-256' as const };
    const key1 = await deriveKeyFromPasscode('SamePass!', salt, opts);
    const key2 = await deriveKeyFromPasscode('SamePass!', salt, opts);

    // Verify by encrypting with key1 and decrypting with key2
    const iv = generateIV();
    const { ciphertext, tag } = await encryptAES_GCM('test-payload', key1, iv);
    const decrypted = await decryptAES_GCM(ciphertext, tag, key2, iv);
    expect(decrypted).toBe('test-payload');
  });

  it('different passcode → different key (different decrypt fails)', async () => {
    const salt = generateSalt();
    const opts = { iterations: 1_000, hash: 'SHA-256' as const };
    const key1 = await deriveKeyFromPasscode('Pass1!', salt, opts);
    const key2 = await deriveKeyFromPasscode('Pass2!', salt, opts);

    const iv = generateIV();
    const { ciphertext, tag } = await encryptAES_GCM('secret', key1, iv);
    await expect(decryptAES_GCM(ciphertext, tag, key2, iv)).rejects.toThrow();
  });

  it('different salt → different key', async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const opts = { iterations: 1_000, hash: 'SHA-256' as const };
    const key1 = await deriveKeyFromPasscode('SamePass!', salt1, opts);
    const key2 = await deriveKeyFromPasscode('SamePass!', salt2, opts);

    const iv = generateIV();
    const { ciphertext, tag } = await encryptAES_GCM('secret', key1, iv);
    await expect(decryptAES_GCM(ciphertext, tag, key2, iv)).rejects.toThrow();
  });

  it('rejects empty passcode', async () => {
    const salt = generateSalt();
    await expect(
      deriveKeyFromPasscode('', salt, { iterations: 1_000, hash: 'SHA-256' })
    ).rejects.toThrow('Passcode cannot be empty');
  });

  it('rejects salt shorter than 16 bytes', async () => {
    await expect(
      deriveKeyFromPasscode('Pass!', new Uint8Array(8), { iterations: 1_000, hash: 'SHA-256' })
    ).rejects.toThrow('at least 16 bytes');
  });

  it('rejects iterations below 1000', async () => {
    await expect(
      deriveKeyFromPasscode('Pass!', generateSalt(), { iterations: 999, hash: 'SHA-256' })
    ).rejects.toThrow('at least 1,000');
  });
});

// ─── v3 backward compatibility ────────────────────────────────────────────────

describe('v3 backward compatibility', () => {
  it('can derive v3 key with 120k iterations and 16-byte salt', async () => {
    const salt = generateSecureRandom(16); // old 16-byte salt
    const key = await deriveKeyFromPasscode('OldData!', salt, {
      iterations: PBKDF2_ITERATIONS_V3,
      hash: 'SHA-256',
    });
    const iv = generateIV();
    const { ciphertext, tag } = await encryptAES_GCM('legacy-data', key, iv);
    const decrypted = await decryptAES_GCM(ciphertext, tag, key, iv);
    expect(decrypted).toBe('legacy-data');
  });
});

// ─── AES-GCM ──────────────────────────────────────────────────────────────────

describe('AES-GCM encrypt / decrypt', () => {
  it('round-trips arbitrary Unicode string', async () => {
    const key = await deriveKeyFromPasscode('k', generateSalt(), { iterations: 1_000, hash: 'SHA-256' });
    const iv = generateIV();
    const plaintext = '₹ 1,00,000 · Invoice #INV-2025-0001 · 🎉';
    const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);
    expect(await decryptAES_GCM(ciphertext, tag, key, iv)).toBe(plaintext);
  });

  it('produces different ciphertext for same plaintext (IV uniqueness)', async () => {
    const key = await deriveKeyFromPasscode('k', generateSalt(), { iterations: 1_000, hash: 'SHA-256' });
    const { ciphertext: c1, tag: t1 } = await encryptAES_GCM('x', key, generateIV());
    const { ciphertext: c2, tag: t2 } = await encryptAES_GCM('x', key, generateIV());
    expect(encodeBase64(c1)).not.toBe(encodeBase64(c2));
  });

  it('fails authentication for corrupted ciphertext', async () => {
    const key = await deriveKeyFromPasscode('k', generateSalt(), { iterations: 1_000, hash: 'SHA-256' });
    const iv = generateIV();
    const { ciphertext, tag } = await encryptAES_GCM('secret', key, iv);
    const corrupted = new Uint8Array(ciphertext);
    corrupted[0] ^= 0xFF;
    await expect(decryptAES_GCM(corrupted, tag, key, iv)).rejects.toThrow();
  });

  it('fails authentication for corrupted tag', async () => {
    const key = await deriveKeyFromPasscode('k', generateSalt(), { iterations: 1_000, hash: 'SHA-256' });
    const iv = generateIV();
    const { ciphertext, tag } = await encryptAES_GCM('secret', key, iv);
    const badTag = new Uint8Array(tag);
    badTag[0] ^= 0xFF;
    await expect(decryptAES_GCM(ciphertext, badTag, key, iv)).rejects.toThrow();
  });
});

// ─── encodeBase64 / decodeBase64 ──────────────────────────────────────────────

describe('Base64 round-trip (chunked implementation)', () => {
  it('round-trips small buffer', () => {
    const original = generateSecureRandom(16);
    expect(decodeBase64(encodeBase64(original))).toEqual(original);
  });

  it('round-trips large buffer (> 8192 bytes, tests chunking)', () => {
    const original = generateSecureRandom(16_000);
    expect(decodeBase64(encodeBase64(original))).toEqual(original);
  });

  it('produces URL-safe characters (no + / =)', () => {
    const encoded = encodeBase64(generateSecureRandom(64));
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('rejects invalid base64', () => {
    expect(() => decodeBase64('!!!invalid!!!')).toThrow();
  });
});

// ─── generateSecureRandom ─────────────────────────────────────────────────────

describe('generateSecureRandom', () => {
  it('generates unique values (entropy check over 200 iterations)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(encodeBase64(generateSecureRandom(16)));
    }
    expect(seen.size).toBe(200);
  });

  it('throws for zero or negative size', () => {
    expect(() => generateSecureRandom(0)).toThrow();
    expect(() => generateSecureRandom(-1)).toThrow();
  });
});
