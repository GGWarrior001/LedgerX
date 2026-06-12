/**
 * v2Migration.ts – Legacy CryptoJS → AES-GCM migration helper
 *
 * Background
 * ──────────
 * LedgerX v2 used CryptoJS AES-ECB ("AES-CryptoJS") for encryption, which
 * has several known weaknesses:
 *   - ECB mode is deterministic: identical plaintexts produce identical ciphertexts
 *   - No authentication tag: tampering is undetectable
 *   - Key derivation was MD5-based (CryptoJS default)
 *
 * v3/v4 use AES-GCM with PBKDF2-SHA256 (210k iterations) and a 128-bit
 * authentication tag.  These are incompatible at the ciphertext level.
 *
 * Why auto-migration is not done in-app
 * ──────────────────────────────────────
 * Requiring crypto-js as a runtime dependency just to support a legacy
 * format that affects very few users is not justified.  Instead, this file
 * provides a standalone migration script that users can run once, after
 * which they should remove crypto-js from their dependencies.
 *
 * Migration steps (one-time, manual)
 * ────────────────────────────────────
 * 1. Install crypto-js temporarily:
 *      npm install crypto-js @types/crypto-js --save-dev
 *
 * 2. Run the migration function below (e.g. from a browser console or a
 *    one-off Vite script) while signed in with the v2 passcode:
 *
 *      import { migrateV2ToV4 } from '@/lib/v2Migration';
 *      await migrateV2ToV4('your-v2-passcode', 'your-new-passcode');
 *
 * 3. Verify all data is readable, then uninstall crypto-js:
 *      npm uninstall crypto-js @types/crypto-js
 *
 * 4. The storage module will no longer warn about v2 envelopes.
 *
 * Security note
 * ─────────────
 * The v2 passcode is used only to decrypt existing v2 data and is never
 * written to storage.  The new passcode is used for v4 AES-GCM encryption
 * with a freshly generated 32-byte salt and 210k PBKDF2 iterations.
 */

import { APP_DATA_KEYS, storage } from './storage';

interface V2Envelope {
  __ledgerx_encrypted: true;
  v: 2;
  alg: 'AES-CryptoJS';
  ct: string;
}

function isV2Envelope(raw: string): V2Envelope | null {
  try {
    const p = JSON.parse(raw);
    if (p?.__ledgerx_encrypted === true && p.v === 2 && p.alg === 'AES-CryptoJS' && p.ct) {
      return p as V2Envelope;
    }
  } catch { /* not JSON */ }
  return null;
}

/**
 * Decrypts a v2 (CryptoJS AES) envelope using the provided passcode.
 *
 * Requires crypto-js to be installed as a dev dependency.
 * This import will fail at runtime if crypto-js is not present — that is
 * intentional: callers must install it first.
 */
async function decryptV2(envelope: V2Envelope, passcode: string): Promise<string> {
  // Dynamic import so this module is tree-shakeable when crypto-js is absent
  const CryptoJS = await import('crypto-js').catch(() => {
    throw new Error(
      'crypto-js is not installed. Run: npm install crypto-js --save-dev'
    );
  });

  const bytes = CryptoJS.AES.decrypt(envelope.ct, passcode);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  if (!decrypted) {
    throw new Error('v2 decryption failed — wrong passcode or corrupted data');
  }
  return decrypted;
}

/**
 * Migrates all v2 (CryptoJS) envelopes to v4 (AES-GCM PBKDF2-SHA256).
 *
 * @param v2Passcode  - The passcode used for existing v2 data
 * @param newPasscode - The passcode to use for the new v4 encryption
 *                      (can be the same as v2Passcode; a fresh salt is generated)
 *
 * @returns A summary of migrated and skipped keys
 */
export async function migrateV2ToV4(
  v2Passcode: string,
  newPasscode: string
): Promise<{ migrated: string[]; skipped: string[]; errors: string[] }> {
  const migrated: string[] = [];
  const skipped:  string[] = [];
  const errors:   string[] = [];

  // Step 1: find all v2 envelopes
  const v2Keys: Array<{ key: string; envelope: V2Envelope }> = [];
  for (const key of APP_DATA_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const envelope = isV2Envelope(raw);
    if (envelope) {
      v2Keys.push({ key, envelope });
    } else {
      skipped.push(key); // not v2 — already v3/v4 or plaintext
    }
  }

  if (v2Keys.length === 0) {
    console.log('[v2Migration] No v2 envelopes found — nothing to migrate.');
    return { migrated, skipped, errors };
  }

  console.log(`[v2Migration] Found ${v2Keys.length} v2 envelope(s) to migrate.`);

  // Step 2: setup v4 encryption if not already set up
  const wasSetup = storage.isEncryptionSetup();
  if (!wasSetup) {
    await storage.setupEncryption(newPasscode);
    console.log('[v2Migration] v4 encryption initialized.');
  } else if (!storage.isUnlocked()) {
    await storage.unlock(newPasscode);
    if (!storage.isUnlocked()) {
      throw new Error('[v2Migration] Could not unlock with newPasscode. Aborting.');
    }
  }

  // Step 3: decrypt v2 → re-encrypt as v4
  for (const { key, envelope } of v2Keys) {
    try {
      const plaintext = await decryptV2(envelope, v2Passcode);
      // Validate JSON before re-encrypting
      JSON.parse(plaintext);
      await storage.save(key, JSON.parse(plaintext));
      migrated.push(key);
      console.log(`[v2Migration] ✓ Migrated "${key}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${key}: ${msg}`);
      console.error(`[v2Migration] ✗ Failed "${key}": ${msg}`);
    }
  }

  // Step 4: summary
  console.log(
    `[v2Migration] Complete. Migrated: ${migrated.length}, ` +
    `Skipped: ${skipped.length}, Errors: ${errors.length}`
  );
  if (errors.length > 0) {
    console.warn('[v2Migration] Some keys failed. Re-enter data manually for failed keys.');
  }

  return { migrated, skipped, errors };
}

/**
 * Checks whether the current localStorage has any v2 envelopes.
 * Use this to decide whether to prompt the user about migration.
 */
export function hasV2Data(): boolean {
  for (const key of APP_DATA_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw && isV2Envelope(raw)) return true;
  }
  return false;
}
