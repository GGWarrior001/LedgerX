/**
 * firestoreService – Firestore API abstraction layer.
 *
 * Re-exports all cloud-persistence helpers from the lower-level
 * `firestoreSync` module so that feature stores and services only
 * ever import from this single surface.
 */
export {
  fetchCloudData,
  saveCloudData,
  addLedgerEntry,
  fetchLedgerEntries,
  type CloudData,
  type EntryType,
  type LedgerEntry,
} from '@/lib/firestoreSync';
