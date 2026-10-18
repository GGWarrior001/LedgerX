/**
 * cryptoWorkerClient.ts – Main-thread interface to crypto.worker.ts
 *
 * Offloads PBKDF2 (210,000 iterations) to a Worker thread so the main
 * thread UI stays responsive during key derivation. On low-end hardware
 * (Lubuntu netbook, entry-level Android) this prevents the lock screen
 * from freezing for 1-2s.
 *
 * Falls back to inline (main-thread) PBKDF2 when:
 *   - Workers are unavailable (SSR / jsdom tests / old WebView)
 *   - Worker fails to start
 *   - Any Worker operation rejects
 *
 * The derived CryptoKey is kept inside the Worker's key cache.  The main
 * thread only ever holds the key handle string (the request id), which is
 * meaningless outside the Worker.  This is an extra layer of isolation —
 * the raw CryptoKey bytes are never on the main thread heap.
 *
 * For the unlock/encrypt/decrypt path used by StorageService, the client
 * re-exports a drop-in `deriveKey()` that matches the signature of
 * `deriveKeyFromPasscode()` in webCrypto.ts.
 */

import {
  deriveKeyFromPasscode,
  decodeBase64,
  encodeBase64,
  type PBKDF2Config,
} from '@/lib/webCrypto';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject:  (reason: unknown) => void;
}

// ── Unique id generator ───────────────────────────────────────────────────────

let _seq = 0;
function nextId(): string {
  return `cw-${Date.now()}-${++_seq}`;
}

// ── CryptoWorkerClient ────────────────────────────────────────────────────────

class CryptoWorkerClient {
  private worker: Worker | null = null;
  private pending = new Map<string, PendingRequest>();
  private available: boolean;

  constructor() {
    this.available = this.trySpawn();
  }

  /** @returns true when the Worker started successfully */
  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Derives a CryptoKey from passcode + salt via the Worker thread.
   * Falls back to main-thread PBKDF2 if the Worker is unavailable.
   *
   * The returned key is fully usable for AES-GCM encrypt/decrypt on the
   * main thread (structured-clone transfer).
   */
  async deriveKey(
    passcode: string,
    salt: Uint8Array,
    config: PBKDF2Config
  ): Promise<CryptoKey> {
    if (!this.available || !this.worker) {
      // Graceful fallback — same security, just blocks the main thread
      return deriveKeyFromPasscode(passcode, salt, config);
    }

    const id = nextId();
    return new Promise<CryptoKey>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker!.postMessage({
        type:       'DERIVE_KEY',
        id,
        passcode,
        saltB64:    encodeBase64(salt),
        iterations: config.iterations,
      });

      // Timeout: if the Worker doesn't respond in 30s fall back to inline
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          // Re-derive inline
          deriveKeyFromPasscode(passcode, salt, config).then(resolve).catch(reject);
        }
      }, 30_000);

      // Override resolve/reject to clear the timer
      const originalResolve = resolve;
      const originalReject  = reject;
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); originalResolve(v as CryptoKey); },
        reject:  (e) => { clearTimeout(timer); originalReject(e); },
      });
    });
  }

  /** Terminates the Worker.  Call on secureWipe() or app teardown. */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker   = null;
      this.available = false;
    }
    this.pending.clear();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private trySpawn(): boolean {
    try {
      if (typeof Worker === 'undefined') return false;

      // Vite worker import: ?worker suffix causes Vite to bundle as a Worker
      this.worker = new Worker(
        new URL('./crypto.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.type === 'PONG') return; // health check response

        const pending = this.pending.get(msg.id);
        if (!pending) return;
        this.pending.delete(msg.id);

        if (msg.type === 'ERROR') {
          pending.reject(new Error(msg.message));
        } else if (msg.type === 'DERIVE_KEY_OK') {
          pending.resolve(msg.key);
        } else {
          pending.resolve(msg);
        }
      };

      this.worker.onerror = (err) => {
        console.error('[LedgerX:CryptoWorker] Worker error:', err.message);
        // Reject all pending requests and disable the worker
        this.pending.forEach(p => p.reject(new Error('Worker error: ' + err.message)));
        this.pending.clear();
        this.available = false;
        this.worker    = null;
      };

      // Health-check ping
      this.worker.postMessage({ type: 'PING' });
      return true;
    } catch {
      return false;
    }
  }
}

// ── Singleton export ───────────────────────────────────────────────────────────

export const cryptoWorker = new CryptoWorkerClient();

/**
 * Drop-in replacement for `deriveKeyFromPasscode` that routes through the
 * Worker when available.  Import this instead of the raw function everywhere
 * derivation is needed in the app (i.e. StorageService).
 */
export async function deriveKeyOffThread(
  passcode: string,
  salt: Uint8Array,
  config: PBKDF2Config
): Promise<CryptoKey> {
  return cryptoWorker.deriveKey(passcode, salt, config);
}
