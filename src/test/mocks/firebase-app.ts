/**
 * Mock for firebase/app - used in tests
 */
import { vi } from 'vitest';

const mockInitializeApp = vi.fn(() => ({ name: '[DEFAULT]' }));
const mockGetApps = vi.fn(() => []);

export {
  mockInitializeApp as initializeApp,
  mockGetApps as getApps,
};
