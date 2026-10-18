/**
 * crypto.worker.ts – Web Worker for PBKDF2 key derivation (POLISH)
 *
 * Problem: 210,000 PBKDF2-SHA256 iterations take ~200-600ms on mid-range
 * hardware and up to 1-2s on Akuma's low-end Lubuntu netbook / entry-level
 * Android devices. Running this on the main thread blocks the UI, freezes
 * the lock screen spinner, and delays the "Unlocking…" feedback.
 *
 * Solution: Move deriveKeyFromPasscode() to a dedicated Worker. The main
 * thread posts { passcode, saltB64, iterations } and receives back a
 * structured clone of the derived CryptoKey.
 *
 * Browser support: All modern browsers support transferring CryptoKey
 * objects via structured clone (Chrome 83+, Firefox 79+, Safari 15+).
 *
 * Usage (from storageService):
 *   const key = await cryptoWorkerClient.deriveKey(passcode, salt, iterations);
 *
 * Worker lifecycle:
 *   - Single shared instance created by CryptoWorkerClient (singleton)
 *   - Terminated on secureWipe() / app teardown
 *   - Falls back to main-thread PBKDF2 if Worker is unavailable (SSR / tests)
 */

import {
  deriveKeyFromPasscode,
  decodeBase64,
  encodeBase64,
  generateIV,
  encryptAES_GCM,
  decryptAES_GCM,
} from '@/lib/webCrypto';

// ── Message protocol ───────────────────────────────────────────────────────────

export type WorkerRequest =
  | { type: 'DERIVE_KEY'; id: string; passcode: string; saltB64: string; iterations: number }
  | { type: 'ENCRYPT';    id: string; plaintext: string; keyHandle: string }
  | { type: 'DECRYPT';    id: string; envelopeB64: string; keyHandle: string }
  | { type: 'PING' };

export type WorkerResponse =
  | { type: 'DERIVE_KEY_OK'; id: string; key: CryptoKey }
  | { type: 'ENCRYPT_OK';    id: string; ivB64: string; ctB64: string; tagB64: string }
  | { type: 'DECRYPT_OK';    id: string; plaintext: string }
  | { type: 'ERROR';         id: string; message: string }
  | { type: 'PONG' };

// ── Key cache (worker-side) ────────────────────────────────────────────────────
// Derived keys are cached by a handle so the main thread doesn't re-derive
// for every encrypt/decrypt call within the same session.
const keyCache = new Map<string, CryptoKey>();

// ── Worker message handler ─────────────────────────────────────────────────────

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;

  try {
    switch (msg.type) {
      case 'PING': {
        self.postMessage({ type: 'PONG' } satisfies WorkerResponse);
        break;
      }

      case 'DERIVE_KEY': {
        const salt = decodeBase64(msg.saltB64);
        const key  = await deriveKeyFromPasscode(msg.passcode, salt, {
          iterations: msg.iterations,
          hash: 'SHA-256',
        });
        // Cache under the request id so the main thread can reference it
        keyCache.set(msg.id, key);
        // Transfer the CryptoKey via structured clone
        self.postMessage({
          type: 'DERIVE_KEY_OK',
          id:   msg.id,
          key,
        } satisfies WorkerResponse);
        break;
      }

      case 'ENCRYPT': {
        const key = keyCache.get(msg.keyHandle);
        if (!key) throw new Error(`Key handle "${msg.keyHandle}" not found in worker cache`);
        const iv = generateIV();
        const { ciphertext, tag } = await encryptAES_GCM(msg.plaintext, key, iv);
        self.postMessage({
          type:   'ENCRYPT_OK',
          id:     msg.id,
          ivB64:  encodeBase64(iv),
          ctB64:  encodeBase64(ciphertext),
          tagB64: encodeBase64(tag),
        } satisfies WorkerResponse);
        break;
      }

      case 'DECRYPT': {
        const key = keyCache.get(msg.keyHandle);
        if (!key) throw new Error(`Key handle "${msg.keyHandle}" not found in worker cache`);
        const [ivB64, ctB64, tagB64] = msg.envelopeB64.split('.');
        const plaintext = await decryptAES_GCM(
          decodeBase64(ctB64),
          decodeBase64(tagB64),
          key,
          decodeBase64(ivB64)
        );
        self.postMessage({
          type:      'DECRYPT_OK',
          id:        msg.id,
          plaintext,
        } satisfies WorkerResponse);
        break;
      }

      default:
        // Unreachable — TypeScript exhaustive check
        break;
    }
  } catch (err) {
    const id = (msg as { id?: string }).id ?? 'unknown';
    self.postMessage({
      type:    'ERROR',
      id,
      message: err instanceof Error ? err.message : String(err),
    } satisfies WorkerResponse);
  }
};
