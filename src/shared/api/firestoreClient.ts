/**
 * Firestore client — abstracts all direct Firestore operations.
 *
 * Every Firebase read/write goes through this module so the rest of the app
 * never imports from 'firebase/firestore' directly.  This makes it trivial to
 * swap Firestore for another backend (REST API, Supabase, etc.) later.
 */
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { CloudData, Invoice, Expense, EntryType, LedgerEntry } from '@/shared/types';

// ─── Cloud data snapshot ─────────────────────────────────────────────────────

function userDoc(uid: string) {
  return doc(db, 'users', uid);
}

export async function fetchCloudData(uid: string): Promise<CloudData | null> {
  try {
    const snap = await getDoc(userDoc(uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      invoices: data.invoices ?? [],
      expenses: data.expenses ?? [],
      clients: data.clients ?? [],
      vendors: data.vendors ?? [],
      profile: data.profile ?? null,
      nextInvId: data.nextInvId ?? 1,
      nextExpId: data.nextExpId ?? 1,
      nextClientId: data.nextClientId ?? 1,
      nextVendorId: data.nextVendorId ?? 1,
    };
  } catch (err) {
    console.error('[LedgerX] Failed to fetch cloud data:', err);
    return null;
  }
}

export async function saveCloudData(uid: string, data: CloudData): Promise<void> {
  try {
    await setDoc(userDoc(uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    // Silently continue – local data is the source of truth when offline.
    console.error('[LedgerX] Failed to save cloud data:', err);
  }
}

// ─── Ledger entries sub-collection ───────────────────────────────────────────

function entriesCollection(uid: string) {
  return collection(db, 'ledgers', uid, 'entries');
}

export async function addLedgerEntry(
  uid: string,
  entryType: EntryType,
  data: Invoice | Expense,
): Promise<void> {
  try {
    await addDoc(entriesCollection(uid), { entryType, data, createdAt: serverTimestamp() });
  } catch (err) {
    console.error('[LedgerX] Failed to add ledger entry:', err);
  }
}

export async function fetchLedgerEntries(
  uid: string,
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
