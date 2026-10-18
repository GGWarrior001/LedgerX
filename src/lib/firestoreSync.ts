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
import { Invoice, Expense, Client, Vendor, Profile } from './types';
import {
  safeNextId,
  sanitizeClients,
  sanitizeExpenses,
  sanitizeInvoices,
  sanitizeProfile,
  sanitizeVendors,
} from './validation';

// ── Ledger entries subcollection ─────────────────────────────────────────────

export type EntryType = 'invoice' | 'expense';

export interface LedgerEntry {
  entryType: EntryType;
  data: Invoice | Expense;
}

function entriesCollection(uid: string) {
  return collection(db, 'ledgers', uid, 'entries');
}

/**
 * Appends a single ledger entry to `ledgers/{uid}/entries`.
 * Called whenever an invoice or expense is created while the user is signed in.
 */
export async function addLedgerEntry(uid: string, entryType: EntryType, data: Invoice | Expense): Promise<void> {
  try {
    await addDoc(entriesCollection(uid), { entryType, data, createdAt: serverTimestamp() });
  } catch (err) {
    console.error('[LedgerX] Failed to add ledger entry:', err);
  }
}

/**
 * Fetches all ledger entries from `ledgers/{uid}/entries`.
 * Returns arrays of invoices and expenses split by entryType.
 */
export async function fetchLedgerEntries(uid: string): Promise<{ invoices: Invoice[]; expenses: Expense[] }> {
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

export interface CloudData {
  invoices: Invoice[];
  expenses: Expense[];
  clients: Client[];
  vendors: Vendor[];
  profile: Profile | null;
  nextInvId: number;
  nextExpId: number;
  nextClientId: number;
  nextVendorId: number;
}

function userDoc(uid: string) {
  return doc(db, 'users', uid);
}

export async function fetchCloudData(uid: string): Promise<CloudData | null> {
  try {
    const snap = await getDoc(userDoc(uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    const invoices = sanitizeInvoices(data.invoices);
    const expenses = sanitizeExpenses(data.expenses);
    const clients = sanitizeClients(data.clients);
    const vendors = sanitizeVendors(data.vendors);
    return {
      invoices,
      expenses,
      clients,
      vendors,
      profile: sanitizeProfile(data.profile),
      nextInvId: safeNextId(invoices, data.nextInvId),
      nextExpId: safeNextId(expenses, data.nextExpId),
      nextClientId: safeNextId(clients, data.nextClientId),
      nextVendorId: safeNextId(vendors, data.nextVendorId),
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
