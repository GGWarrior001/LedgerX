/**
 * Tests for WebCrypto encryption primitives
 * 
 * Comprehensive test coverage for:
 * - PBKDF2 key derivation (determinism, different salts/passphrases)
 * - AES-GCM encryption/decryption (round-trip, corruption detection)
 * - Secure random generation (entropy, uniqueness)
 * - Base64 encoding/decoding (round-trip, URL-safe variants)
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
} from '@/lib/webCrypto';

describe('webCrypto – WebCrypto encryption primitives', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Random Generation Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('generateSecureRandom', () => {
    it('generates random bytes of requested length', () => {
      const bytes = generateSecureRandom(32);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(32);
    });

    it('generates different values on each call (high entropy)', () => {
      const bytes1 = generateSecureRandom(32);
      const bytes2 = generateSecureRandom(32);
      expect(bytes1).not.toEqual(bytes2);
    });

    it('generates different IVs on each call', () => {
      const iv1 = generateIV();
      const iv2 = generateIV();
      expect(iv1).not.toEqual(iv2);
      expect(iv1.length).toBe(CRYPTO_CONSTANTS.IV_SIZE_BYTES);
      expect(iv2.length).toBe(CRYPTO_CONSTANTS.IV_SIZE_BYTES);
    });

    it('generates different salts on each call', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toEqual(salt2);
      expect(salt1.length).toBe(16);
      expect(salt2.length).toBe(16);
    });

    it('throws for invalid byte count', () => {
      expect(() => generateSecureRandom(0)).toThrow();
      expect(() => generateSecureRandom(-1)).toThrow();
    });

    it('generates large random values (collision resistance)', () => {
      // Generate 100 salts, verify all unique (2^128 space, 100 samples unlikely to collide)
      const salts = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const salt = generateSalt();
        const encoded = encodeBase64(salt);
        expect(salts.has(encoded)).toBe(false); // No collision yet
        salts.add(encoded);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PBKDF2 Key Derivation Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('deriveKeyFromPasscode – PBKDF2 determinism', () => {
    let salt: Uint8Array;

    beforeEach(() => {
      salt = generateSalt();
    });

    it('derives same key from identical passcode + salt + iterations', async () => {
      const key1 = await deriveKeyFromPasscode('MyPassword123!', salt);
      const key2 = await deriveKeyFromPasscode('MyPassword123!', salt);

      // CryptoKey objects can't be compared directly, so encrypt same plaintext with both
      const plaintext = 'test';
      const iv = generateIV();

      const { ciphertext: ct1, tag: tag1 } = await encryptAES_GCM(plaintext, key1, iv);
      const { ciphertext: ct2, tag: tag2 } = await encryptAES_GCM(plaintext, key2, iv);

      // Same key + plaintext + IV → same ciphertext + tag
      expect(ct1).toEqual(ct2);
      expect(tag1).toEqual(tag2);
    });

    it('derives different key from different passcode', async () => {
      const key1 = await deriveKeyFromPasscode('pass1', salt);
      const key2 = await deriveKeyFromPasscode('pass2', salt);

      const plaintext = 'test';
      const iv = generateIV();

      const { ciphertext: ct1 } = await encryptAES_GCM(plaintext, key1, iv);
      const { ciphertext: ct2 } = await encryptAES_GCM(plaintext, key2, iv);

      // Different keys → different ciphertexts
      expect(ct1).not.toEqual(ct2);
    });

    it('derives different key from different salt', async () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();

      const key1 = await deriveKeyFromPasscode('same', salt1);
      const key2 = await deriveKeyFromPasscode('same', salt2);

      const plaintext = 'test';
      const iv = generateIV();

      const { ciphertext: ct1 } = await encryptAES_GCM(plaintext, key1, iv);
      const { ciphertext: ct2 } = await encryptAES_GCM(plaintext, key2, iv);

      expect(ct1).not.toEqual(ct2);
    });

    it('handles Unicode passphrases', async () => {
      const unicodePasscodes = [
        '你好世界🔐',
        'مرحبا العالم',
        'Здравствуй мир',
        'こんにちは世界',
      ];

      for (const passcode of unicodePasscodes) {
        const key = await deriveKeyFromPasscode(passcode, salt);
        const plaintext = 'data';
        const iv = generateIV();

        const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);
        const decrypted = await decryptAES_GCM(ciphertext, tag, key, iv);

        expect(decrypted).toBe(plaintext);
      }
    });

    it('handles very long passphrases', async () => {
      const longPasscode = 'x'.repeat(1000);
      const key = await deriveKeyFromPasscode(longPasscode, salt);

      const plaintext = 'test';
      const iv = generateIV();
      const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);
      const decrypted = await decryptAES_GCM(ciphertext, tag, key, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('rejects empty passcode', async () => {
      await expect(deriveKeyFromPasscode('', salt)).rejects.toThrow('empty');
    });

    it('rejects empty salt', async () => {
      await expect(deriveKeyFromPasscode('pass', new Uint8Array())).rejects.toThrow('empty');
    });

    it('rejects too few PBKDF2 iterations', async () => {
      await expect(
        deriveKeyFromPasscode('pass', salt, { iterations: 500, hash: 'SHA-256' })
      ).rejects.toThrow('at least 1000');
    });

    it('accepts custom iteration counts', async () => {
      const customIterations = 50_000;
      const key = await deriveKeyFromPasscode('pass', salt, {
        iterations: customIterations,
        hash: 'SHA-256',
      });

      const plaintext = 'test';
      const iv = generateIV();
      const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);
      const decrypted = await decryptAES_GCM(ciphertext, tag, key, iv);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('deriveKeyDeterministic – backward compatibility', () => {
    it('derives deterministic key for decryption', async () => {
      const passcode = 'MyPassword123!';
      const salt = generateSalt();
      const iterations = 120_000;

      const key1 = await deriveKeyDeterministic(passcode, salt, iterations);
      const key2 = await deriveKeyDeterministic(passcode, salt, iterations);

      // Verify same key by encryption round-trip
      const plaintext = 'encrypted data';
      const iv = generateIV();

      const { ciphertext, tag } = await encryptAES_GCM(plaintext, key1, iv);
      const decrypted = await decryptAES_GCM(ciphertext, tag, key2, iv);

      expect(decrypted).toBe(plaintext);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AES-GCM Encryption / Decryption Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('encryptAES_GCM / decryptAES_GCM – round-trip', () => {
    let key: CryptoKey;
    let salt: Uint8Array;

    beforeEach(async () => {
      salt = generateSalt();
      key = await deriveKeyFromPasscode('test-password', salt);
    });

    it('encrypts and decrypts plaintext', async () => {
      const plaintext = 'Hello, World!';
      const iv = generateIV();

      const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);
      const decrypted = await decryptAES_GCM(ciphertext, tag, key, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('handles empty string', async () => {
      const plaintext = '';
      const iv = generateIV();

      const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);
      const decrypted = await decryptAES_GCM(ciphertext, tag, key, iv);

      expect(decrypted).toBe('');
    });

    it('handles JSON data', async () => {
      const data = {
        id: 123,
        name: 'Invoice',
        amount: 1000,
        items: [{ sku: 'A1', qty: 5 }],
      };
      const plaintext = JSON.stringify(data);
      const iv = generateIV();

      const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);
      const decrypted = await decryptAES_GCM(ciphertext, tag, key, iv);

      expect(JSON.parse(decrypted)).toEqual(data);
    });

    it('handles large payload (> 1MB)', async () => {
      const plaintext = 'x'.repeat(1024 * 1024 + 500);
      const iv = generateIV();

      const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);
      const decrypted = await decryptAES_GCM(ciphertext, tag, key, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('handles Unicode data', async () => {
      const plaintext = '{"message": "你好世界 🌍 مرحبا"}';
      const iv = generateIV();

      const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);
      const decrypted = await decryptAES_GCM(ciphertext, tag, key, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('produces different ciphertexts for same plaintext (random IV)', async () => {
      const plaintext = 'constant data';
      const iv1 = generateIV();
      const iv2 = generateIV();

      const { ciphertext: ct1 } = await encryptAES_GCM(plaintext, key, iv1);
      const { ciphertext: ct2 } = await encryptAES_GCM(plaintext, key, iv2);

      // Different IVs → different ciphertexts (even for same plaintext)
      expect(ct1).not.toEqual(ct2);
    });

    it('rejects missing key', async () => {
      const plaintext = 'test';
      const iv = generateIV();

      await expect(
        encryptAES_GCM(plaintext, null as never, iv)
      ).rejects.toThrow('Key is required');
    });

    it('rejects invalid IV size', async () => {
      const plaintext = 'test';
      const badIV = new Uint8Array(16); // Wrong size (should be 12)

      await expect(encryptAES_GCM(plaintext, key, badIV)).rejects.toThrow('IV must be');
    });
  });

  describe('encryptAES_GCM / decryptAES_GCM – authentication tag validation', () => {
    let key: CryptoKey;

    beforeEach(async () => {
      const salt = generateSalt();
      key = await deriveKeyFromPasscode('test-password', salt);
    });

    it('detects tampered authentication tag', async () => {
      const plaintext = 'Secret Data';
      const iv = generateIV();

      const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);

      // Flip a bit in the tag
      tag[0] ^= 0xFF;

      await expect(decryptAES_GCM(ciphertext, tag, key, iv)).rejects.toThrow(
        'Authentication tag verification failed'
      );
    });

    it('detects corrupted ciphertext', async () => {
      const plaintext = 'Secret Data';
      const iv = generateIV();

      const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);

      // Flip a bit in the ciphertext
      ciphertext[Math.floor(ciphertext.length / 2)] ^= 0xFF;

      await expect(decryptAES_GCM(ciphertext, tag, key, iv)).rejects.toThrow(
        'Authentication tag verification failed'
      );
    });

    it('detects corrupted IV', async () => {
      const plaintext = 'Secret Data';
      const iv = generateIV();

      const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);

      // Use wrong IV for decryption
      const wrongIV = generateIV();

      await expect(decryptAES_GCM(ciphertext, tag, key, wrongIV)).rejects.toThrow(
        'Authentication tag verification failed'
      );
    });

    it('rejects with wrong key', async () => {
      const plaintext = 'Secret Data';
      const iv = generateIV();

      const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);

      // Derive different key
      const salt = generateSalt();
      const wrongKey = await deriveKeyFromPasscode('different-password', salt);

      await expect(decryptAES_GCM(ciphertext, tag, wrongKey, iv)).rejects.toThrow(
        'Authentication tag verification failed'
      );
    });

    it('rejects invalid tag size', async () => {
      const plaintext = 'test';
      const iv = generateIV();
      const { ciphertext } = await encryptAES_GCM(plaintext, key, iv);

      const badTag = new Uint8Array(8); // Wrong size (should be 16)

      await expect(decryptAES_GCM(ciphertext, badTag, key, iv)).rejects.toThrow(
        'Authentication tag must be exactly'
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Base64 Encoding / Decoding Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('encodeBase64 / decodeBase64 – round-trip', () => {
    it('encodes and decodes binary data', () => {
      const original = generateSecureRandom(32);
      const encoded = encodeBase64(original);
      const decoded = decodeBase64(encoded);

      expect(decoded).toEqual(original);
    });

    it('uses URL-safe base64 encoding', () => {
      const data = generateSecureRandom(32);
      const encoded = encodeBase64(data);

      // URL-safe: no +, /, or = characters
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });

    it('handles empty data', () => {
      const empty = new Uint8Array();
      const encoded = encodeBase64(empty);
      const decoded = decodeBase64(encoded);

      expect(decoded).toEqual(empty);
    });

    it('handles various data lengths', () => {
      const lengths = [1, 3, 16, 64, 256, 1024];

      for (const len of lengths) {
        const data = generateSecureRandom(len);
        const encoded = encodeBase64(data);
        const decoded = decodeBase64(encoded);

        expect(decoded).toEqual(data);
      }
    });

    it('rejects invalid base64', () => {
      expect(() => decodeBase64('!!!invalid!!!')).toThrow('Invalid base64');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Integration Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('Integration – Full encryption workflow', () => {
    it('complete workflow: derive key → encrypt → store → retrieve → decrypt', async () => {
      // Setup
      const passcode = 'MySecurePassword123!';
      const salt = generateSalt();

      // Encrypt phase
      const key = await deriveKeyFromPasscode(passcode, salt);
      const plaintext = JSON.stringify({ invoices: [{ id: 1, amount: 1000 }] });
      const iv = generateIV();

      const { ciphertext, tag } = await encryptAES_GCM(plaintext, key, iv);

      // Simulate storage: encode to JSON-serializable format
      const stored = {
        v: 3,
        salt: encodeBase64(salt),
        iv: encodeBase64(iv),
        ct: encodeBase64(ciphertext),
        tag: encodeBase64(tag),
      };

      const json = JSON.stringify(stored);

      // Simulate retrieval: decode from storage
      const retrieved = JSON.parse(json);

      // Decrypt phase
      const decodedKey = await deriveKeyFromPasscode(
        passcode,
        decodeBase64(retrieved.salt)
      );
      const decodedCiphertext = decodeBase64(retrieved.ct);
      const decodedTag = decodeBase64(retrieved.tag);
      const decodedIV = decodeBase64(retrieved.iv);

      const decrypted = await decryptAES_GCM(
        decodedCiphertext,
        decodedTag,
        decodedKey,
        decodedIV
      );

      // Verify
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(plaintext));
    });

    it('wrong passcode fails to decrypt', async () => {
      const correctPasscode = 'Correct123!';
      const wrongPasscode = 'Wrong456!';
      const salt = generateSalt();

      // Encrypt with correct passcode
      const correctKey = await deriveKeyFromPasscode(correctPasscode, salt);
      const plaintext = 'secret data';
      const iv = generateIV();

      const { ciphertext, tag } = await encryptAES_GCM(plaintext, correctKey, iv);

      // Try to decrypt with wrong passcode
      const wrongKey = await deriveKeyFromPasscode(wrongPasscode, salt);

      await expect(decryptAES_GCM(ciphertext, tag, wrongKey, iv)).rejects.toThrow(
        'Authentication tag verification failed'
      );
    });
  });
});
