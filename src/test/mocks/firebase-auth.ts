/**
 * Mock for firebase/auth - used in tests
 */
import { vi } from 'vitest';

const mockGetAuth = vi.fn(() => ({}));
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChanged = vi.fn();
const mockSetPersistence = vi.fn();
const mockBrowserLocalPersistence = {};

export {
  mockGetAuth as getAuth,
  mockSignInWithEmailAndPassword as signInWithEmailAndPassword,
  mockCreateUserWithEmailAndPassword as createUserWithEmailAndPassword,
  mockSignOut as signOut,
  mockOnAuthStateChanged as onAuthStateChanged,
  mockSetPersistence as setPersistence,
  mockBrowserLocalPersistence as browserLocalPersistence,
};
