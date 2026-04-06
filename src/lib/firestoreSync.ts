import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Invoice, Expense, Client, Vendor, Profile } from './types';

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
