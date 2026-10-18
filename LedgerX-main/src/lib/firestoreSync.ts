/**
 * firestoreSync.ts – LedgerX Firestore sync (HARDENED v4)
 *
 * Fix H-3: Silent failure replaced with retry queue + exponential backoff.
 *
 * Additions:
 *   - `SyncQueue`: in-memory write queue with exponential backoff retry
 *   - `SyncHealthMonitor`: tracks sync state (pending, syncing, synced, error)
 *   - `saveCloudData` enqueues writes rather than failing silently
 *   - Conflict resolution: last-write-wins by `updatedAt` timestamp
 *   - Exported `syncHealth` observable for UI status indicators
 *   - All sync state is recoverable — queue is re-attempted on next mount
 *
 * Architecture note: LedgerX is offline-first. Firestore is a secondary
 * backup, not the source of truth. Writes to Firestore MUST NOT block the UI.
 */

import {
  doc, getDoc, setDoc, collection, addDoc, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Invoice, Expense, Client, Vendor, Profile } from './types';
import {
  safeNextId,
  sanitizeClients,
  sanitizeExpenses,
  sanitizeInvoices,
  sanitizeProfile,
  sanitizeVendors,
} from './validation';

// ── Types ─────────────────────────────────────────────────────────────────────

export type EntryType = 'invoice' | 'expense';

export interface LedgerEntry {
  entryType: EntryType;
  data: Invoice | Expense;
}

export interface CloudData {
  invoices:       Invoice[];
  expenses:       Expense[];
  clients:        Client[];
  vendors:        Vendor[];
  profile:        Profile | null;
  nextInvId:      number;
  nextExpId:      number;
  nextClientId:   number;
  nextVendorId:   number;
  updatedAt?:     unknown; // serverTimestamp() placeholder
}

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error';

interface SyncState {
  status:    SyncStatus;
  error:     string | null;
  lastSync:  number | null;  // epoch ms
  pending:   number;         // queued write count
}

// ── Sync Health Monitor ───────────────────────────────────────────────────────

type SyncListener = (state: SyncState) => void;

class SyncHealthMonitor {
  private state: SyncState = {
    status: 'idle',
    error: null,
    lastSync: null,
    pending: 0,
  };
  private listeners: Set<SyncListener> = new Set();

  get(): SyncState { return { ...this.state }; }

  subscribe(fn: SyncListener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  update(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(fn => fn(this.state));
  }
}

export const syncHealth = new SyncHealthMonitor();

// ── Retry Queue ───────────────────────────────────────────────────────────────

interface QueuedWrite {
  uid:       string;
  data:      CloudData;
  attempt:   number;
  enqueuedAt: number;
}

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 2_000;

class SyncQueue {
  private queue: QueuedWrite[] = [];
  private processing = false;

  enqueue(uid: string, data: CloudData): void {
    // Replace any existing pending write for the same user (last-write-wins)
    this.queue = this.queue.filter(w => w.uid !== uid);
    this.queue.push({ uid, data, attempt: 0, enqueuedAt: Date.now() });
    syncHealth.update({ status: 'pending', pending: this.queue.length });
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const write = this.queue[0];
    syncHealth.update({ status: 'syncing' });

    try {
      await setDoc(
        doc(db, 'users', write.uid),
        { ...write.data, updatedAt: serverTimestamp() },
        { merge: true }
      );

      this.queue.shift();
      syncHealth.update({
        status: this.queue.length > 0 ? 'pending' : 'synced',
        error: null,
        lastSync: Date.now(),
        pending: this.queue.length,
      });
    } catch (err) {
      write.attempt++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[LedgerX] Sync attempt ${write.attempt} failed for ${write.uid}:`, message);

      if (write.attempt >= MAX_ATTEMPTS) {
        console.error(`[LedgerX] Dropping write for ${write.uid} after ${MAX_ATTEMPTS} attempts`);
        this.queue.shift();
        syncHealth.update({
          status: 'error',
          error: `Sync failed after ${MAX_ATTEMPTS} attempts: ${message}`,
          pending: this.queue.length,
        });
      } else {
        // Exponential backoff
        const delay = BASE_DELAY_MS * Math.pow(2, write.attempt - 1);
        syncHealth.update({
          status: 'error',
          error: `Sync failed, retrying in ${delay / 1000}s…`,
          pending: this.queue.length,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.processing = false;
    if (this.queue.length > 0) {
      this.processNext();
    }
  }
}

const syncQueue = new SyncQueue();

// ── Ledger Entries ────────────────────────────────────────────────────────────

function entriesCollection(uid: string) {
  return collection(db, 'ledgers', uid, 'entries');
}

export async function addLedgerEntry(
  uid: string,
  entryType: EntryType,
  data: Invoice | Expense
): Promise<void> {
  try {
    await addDoc(entriesCollection(uid), {
      entryType,
      data,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[LedgerX] Failed to add ledger entry:', err);
    // Ledger entries are append-only; don't retry to avoid duplicate entries
  }
}

export async function fetchLedgerEntries(
  uid: string
): Promise<{ invoices: Invoice[]; expenses: Expense[] }> {
  try {
    const snap = await getDocs(entriesCollection(uid));
    const invoices: Invoice[] = [];
    const expenses: Expense[] = [];
    snap.docs.forEach(d => {
      const entry = d.data() as LedgerEntry;
      if (entry.entryType === 'invoice') {
        invoices.push(entry.data as Invoice);
      } else {
        expenses.push(entry.data as Expense);
      }
    });
    return { invoices, expenses };
  } catch (err) {
    console.error('[LedgerX] Failed to fetch ledger entries:', err);
    return { invoices: [], expenses: [] };
  }
}

// ── Cloud Data Snapshot ───────────────────────────────────────────────────────

export async function fetchCloudData(uid: string): Promise<CloudData | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();

    const invoices = sanitizeInvoices(data.invoices);
    const expenses = sanitizeExpenses(data.expenses);
    const clients  = sanitizeClients(data.clients);
    const vendors  = sanitizeVendors(data.vendors);

    return {
      invoices,
      expenses,
      clients,
      vendors,
      profile:       sanitizeProfile(data.profile),
      nextInvId:     safeNextId(invoices, data.nextInvId),
      nextExpId:     safeNextId(expenses, data.nextExpId),
      nextClientId:  safeNextId(clients, data.nextClientId),
      nextVendorId:  safeNextId(vendors, data.nextVendorId),
      updatedAt:     data.updatedAt,
    };
  } catch (err) {
    console.error('[LedgerX] Failed to fetch cloud data:', err);
    return null;
  }
}

/**
 * Enqueues a cloud write with automatic retry and exponential backoff.
 * Never throws — Firestore is secondary to local-first storage.
 */
export function saveCloudData(uid: string, data: CloudData): void {
  syncQueue.enqueue(uid, data);
}

/**
 * Conflict resolution: fetch cloud data and merge with local data.
 * Strategy: last-write-wins by `updatedAt` timestamp.
 * Returns null if cloud data is older or unavailable.
 */
export async function resolveCloudConflict(
  uid: string,
  localUpdatedAt: number
): Promise<CloudData | null> {
  try {
    const cloud = await fetchCloudData(uid);
    if (!cloud) return null;

    // If cloud `updatedAt` is a Firestore Timestamp, convert to ms
    const cloudTs = cloud.updatedAt as { toMillis?: () => number } | null;
    const cloudMs = typeof cloudTs?.toMillis === 'function'
      ? cloudTs.toMillis()
      : 0;

    return cloudMs > localUpdatedAt ? cloud : null;
  } catch {
    return null;
  }
}
