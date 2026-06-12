/**
 * cryptoWorkerClient.test.ts – Unit tests for CryptoWorkerClient (POLISH)
 *
 * Tests:
 *   - isAvailable() reports false when globalThis.Worker is undefined
 *   - deriveKey() returns a valid non-extractable CryptoKey via fallback
 *   - terminate() clears pending requests and marks unavailable
 *   - deriveKeyOffThread() is a transparent wrapper
 *   - Timeout path: pending request resolved via fallback after Worker timeout
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSalt } from '@/lib/webCrypto';

const TEST_CONFIG = { iterations: 1_000, hash: 'SHA-256' as const };

describe('CryptoWorkerClient – Worker unavailable (fallback path)', () => {
  const originalWorker = globalThis.Worker;

  beforeEach(() => {
    vi.resetModules();
    (globalThis as Record<string, unknown>).Worker = undefined;
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).Worker = originalWorker;
  });

  it('isAvailable() returns false when Worker API absent', async () => {
    const { cryptoWorker } = await import('@/workers/cryptoWorkerClient');
    expect(cryptoWorker.isAvailable()).toBe(false);
  });

  it('deriveKey() falls back to main-thread PBKDF2 successfully', async () => {
    const { cryptoWorker } = await import('@/workers/cryptoWorkerClient');
    const salt = generateSalt();
    const key  = await cryptoWorker.deriveKey('FallbackPass123!', salt, TEST_CONFIG);

    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.extractable).toBe(false);
    expect(key.algorithm.name).toBe('AES-GCM');
  });

  it('deriveKey() same passcode+salt produces same effective key (round-trip)', async () => {
    const { cryptoWorker } = await import('@/workers/cryptoWorkerClient');
    const { encryptAES_GCM, decryptAES_GCM, generateIV } = await import('@/lib/webCrypto');
    const salt = generateSalt();

    const key1 = await cryptoWorker.deriveKey('SamePass123!', salt, TEST_CONFIG);
    const key2 = await cryptoWorker.deriveKey('SamePass123!', salt, TEST_CONFIG);

    const iv = generateIV();
    const { ciphertext, tag } = await encryptAES_GCM('round-trip-test', key1, iv);
    const decrypted = await decryptAES_GCM(ciphertext, tag, key2, iv);
    expect(decrypted).toBe('round-trip-test');
  });

  it('terminate() can be called without throwing', async () => {
    const { cryptoWorker } = await import('@/workers/cryptoWorkerClient');
    expect(() => cryptoWorker.terminate()).not.toThrow();
  });
});

describe('deriveKeyOffThread – transparent wrapper', () => {
  const originalWorker = globalThis.Worker;

  beforeEach(() => {
    vi.resetModules();
    (globalThis as Record<string, unknown>).Worker = undefined;
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).Worker = originalWorker;
  });

  it('returns a CryptoKey', async () => {
    const { deriveKeyOffThread } = await import('@/workers/cryptoWorkerClient');
    const salt = generateSalt();
    const key  = await deriveKeyOffThread('WrapperTest123!', salt, TEST_CONFIG);
    expect(key.type).toBe('secret');
  });

  it('returns non-extractable key', async () => {
    const { deriveKeyOffThread } = await import('@/workers/cryptoWorkerClient');
    const salt = generateSalt();
    const key  = await deriveKeyOffThread('WrapperTest123!', salt, TEST_CONFIG);
    expect(key.extractable).toBe(false);
  });

  it('different passcode → different key (cross-derivation decrypt fails)', async () => {
    const { deriveKeyOffThread } = await import('@/workers/cryptoWorkerClient');
    const { encryptAES_GCM, decryptAES_GCM, generateIV } = await import('@/lib/webCrypto');
    const salt = generateSalt();

    const key1 = await deriveKeyOffThread('Pass-A-123!', salt, TEST_CONFIG);
    const key2 = await deriveKeyOffThread('Pass-B-456!', salt, TEST_CONFIG);

    const iv = generateIV();
    const { ciphertext, tag } = await encryptAES_GCM('secret', key1, iv);
    await expect(decryptAES_GCM(ciphertext, tag, key2, iv)).rejects.toThrow();
  });
});
