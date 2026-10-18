/**
 * Mock for firebase/firestore - used in tests
 */
import { vi } from 'vitest';

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _seconds: 0 }));
const mockDoc = vi.fn((_db: unknown, ...args: string[]) => ({ path: args.join('/') }));
const mockCollection = vi.fn((_db: unknown, ...args: string[]) => ({ path: args.join('/') }));
const mockGetFirestore = vi.fn(() => ({}));

export {
  mockGetDoc as getDoc,
  mockSetDoc as setDoc,
  mockAddDoc as addDoc,
  mockGetDocs as getDocs,
  mockServerTimestamp as serverTimestamp,
  mockDoc as doc,
  mockCollection as collection,
  mockGetFirestore as getFirestore,
};
