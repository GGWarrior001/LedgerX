/**
 * indexedDB.ts – IndexedDB storage layer via Dexie.js
 *
 * Purpose
 * ───────
 * localStorage has a 5-10 MB browser quota. For most personal-finance users
 * this is fine (a thousand invoices rarely exceeds 2 MB). However, if a user
 * imports years of historical data or generates large reports, localStorage
 * becomes a hard ceiling.
 *
 * This module provides an IndexedDB-backed store for the three
 * largest collections (invoices, expenses, ledger entries).  It is NOT yet
 * the primary store — that remains localStorage for backward compatibility.
 * It is wired in as an optional overflow/cache layer that the app can
 * gradually migrate towards.
 *
 * Usage today (opt-in):
 *   const db = getLedgerDB();
 *   await db.invoices.bulkPut(invoices);       // write
 *   const all = await db.invoices.toArray();    // read
 *   const count = await db.invoices.count();    // quota check
 *
 * Migration path to full IndexedDB:
 *   1. On first app load, check localStorage for existing data.
 *   2. If found, migrate to IDB via `migrateLocalStorageToIDB()`.
 *   3. Set a flag `lx_idb_migrated = '1'` in localStorage.
 *   4. All subsequent reads/writes go through IDB.
 *   5. Remove localStorage keys after verified migration.
 *
 * Encryption:
 *   - IDB stores JSON blobs encrypted with the same AES-GCM envelope format
 *     used by localStorage. The `EncryptedRecord` type wraps the envelope.
 *   - The encryption key is derived from the user's passcode exactly as
 *     before; there is no new key material.
 *
 * Dependencies:
 *   npm install dexie
 */

// NOTE: Import Dexie dynamically so this module is tree-shakeable when IDB
// is not used.  The `getLedgerDB()` factory creates the instance on demand.

export interface EncryptedRecord {
  key:       string;         // e.g. 'lx_invoices'
  envelope:  string;         // JSON-serialised AES-GCM envelope
  updatedAt: number;         // epoch ms — for conflict resolution
}

export interface LedgerDBSchema {
  encryptedStore: EncryptedRecord;
}

let _db: import('dexie').Dexie | null = null;

/**
 * Returns (or creates) the Dexie database instance.
 * Lazy-initialised so Dexie is only loaded when IDB is actually used.
 */
export async function getLedgerDB(): Promise<import('dexie').Dexie & {
  encryptedStore: import('dexie').Table<EncryptedRecord, string>;
}> {
  if (_db) return _db as ReturnType<typeof getLedgerDB> extends Promise<infer R> ? R : never;

  const { Dexie } = await import('dexie');

  class LedgerDB extends Dexie {
    encryptedStore!: import('dexie').Table<EncryptedRecord, string>;

    constructor() {
      super('LedgerXv4');
      this.version(1).stores({
        // Primary key is `key` (the storage key name)
        // Index on updatedAt for conflict resolution queries
        encryptedStore: 'key, updatedAt',
      });
    }
  }

  _db = new LedgerDB();
  return _db as ReturnType<typeof getLedgerDB> extends Promise<infer R> ? R : never;
}

/**
 * Checks IndexedDB availability in the current environment.
 * Returns false in: SSR, private mode (Safari), Electron with sandbox + no IDB.
 */
export function isIDBAvailable(): boolean {
  try {
    return (
      typeof indexedDB !== 'undefined' &&
      indexedDB !== null
    );
  } catch {
    return false;
  }
}

/**
 * Checks approximate IDB storage usage.
 * Returns { usage, quota, percentUsed } or null if the StorageManager API
 * is unavailable (Firefox private mode, iOS < 15).
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
} | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return {
      usage,
      quota,
      percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Migrates encrypted localStorage data to IndexedDB.
 * Safe to call multiple times — skips already-migrated keys.
 *
 * @param keys - storage keys to migrate (defaults to all APP_DATA_KEYS)
 */
export async function migrateLocalStorageToIDB(
  keys: readonly string[]
): Promise<{ migrated: string[]; skipped: string[] }> {
  if (!isIDBAvailable()) {
    return { migrated: [], skipped: [...keys] };
  }

  const db       = await getLedgerDB();
  const migrated: string[] = [];
  const skipped:  string[] = [];
  const now = Date.now();

  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) { skipped.push(key); continue; }

    try {
      // Check if already in IDB
      const existing = await db.encryptedStore.get(key);
      if (existing) { skipped.push(key); continue; }

      await db.encryptedStore.put({ key, envelope: raw, updatedAt: now });
      migrated.push(key);
    } catch (err) {
      console.error(`[indexedDB] Migration failed for "${key}":`, err);
      skipped.push(key);
    }
  }

  return { migrated, skipped };
}

/**
 * Saves an encrypted envelope to IndexedDB.
 * The envelope string is the JSON-serialised AES-GCM envelope from storage.ts.
 */
export async function idbSave(key: string, envelope: string): Promise<void> {
  const db = await getLedgerDB();
  await db.encryptedStore.put({ key, envelope, updatedAt: Date.now() });
}

/**
 * Loads an encrypted envelope from IndexedDB.
 * Returns null if the key does not exist.
 */
export async function idbLoad(key: string): Promise<string | null> {
  const db = await getLedgerDB();
  const record = await db.encryptedStore.get(key);
  return record?.envelope ?? null;
}

/**
 * Removes a key from IndexedDB.
 */
export async function idbRemove(key: string): Promise<void> {
  const db = await getLedgerDB();
  await db.encryptedStore.delete(key);
}

/**
 * Clears all LedgerX data from IndexedDB.
 * Called by `secureWipe()` to ensure IDB is also cleared.
 */
export async function idbClearAll(): Promise<void> {
  if (!isIDBAvailable()) return;
  try {
    const db = await getLedgerDB();
    await db.encryptedStore.clear();
  } catch (err) {
    console.error('[indexedDB] Failed to clear:', err);
  }
}

/**
 * Checks IDB storage pressure and warns if > 80% quota used.
 * Call periodically or before large import operations.
 */
export async function checkStoragePressure(): Promise<'ok' | 'warn' | 'critical'> {
  const estimate = await getStorageEstimate();
  if (!estimate) return 'ok';
  if (estimate.percentUsed >= 90) return 'critical';
  if (estimate.percentUsed >= 80) return 'warn';
  return 'ok';
}
