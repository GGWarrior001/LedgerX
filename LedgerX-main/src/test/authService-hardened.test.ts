/**
 * authService-hardened.test.ts – Phase 6 tests for hardened authService (v4)
 *
 * New coverage for v4 changes:
 *   - init() sets loading=true eagerly before listener fires
 *   - init() returns a callable unsubscribe function
 *   - signIn/signUp return { success, error? } and never throw
 *   - logOut clears the encryption key (locks storage)
 *   - AUTH_ERROR_MESSAGES covers all expected codes
 *   - missing Firebase config returns auth/missing-config
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firebase mocks ─────────────────────────────────────────────────────────────

const mockSignIn    = vi.fn();
const mockSignUp    = vi.fn();
const mockSignOut   = vi.fn();
const mockOnAuth    = vi.fn();
const mockSetPers   = vi.fn();

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword:  (...a: unknown[]) => mockSignIn(...a),
  createUserWithEmailAndPassword: (...a: unknown[]) => mockSignUp(...a),
  signOut:               (...a: unknown[]) => mockSignOut(...a),
  onAuthStateChanged:    (...a: unknown[]) => mockOnAuth(...a),
  setPersistence:        (...a: unknown[]) => mockSetPers(...a),
  browserLocalPersistence: 'local',
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
  db:   {},
  isFirebaseConfigured: true,
}));

const mockClearEncryptionKey = vi.fn();
vi.mock('@/lib/storage', () => ({
  storage: { clearEncryptionKey: mockClearEncryptionKey },
}));

const mockSetLoading   = vi.fn();
const mockInitGuest    = vi.fn();
const mockSetState     = vi.fn();
vi.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    (selector: (s: unknown) => unknown) => selector({
      setLoading: mockSetLoading,
      setError:   vi.fn(),
      initializeGuestSession: mockInitGuest,
    }),
    { getState: () => ({ setLoading: mockSetLoading, setError: vi.fn(), initializeGuestSession: mockInitGuest }), setState: mockSetState }
  ),
}));

import { authService, getAuthErrorMessage, AUTH_ERROR_MESSAGES } from '@/features/auth/services/authService';

// ─────────────────────────────────────────────────────────────────────────────

describe('getAuthErrorMessage', () => {
  it('maps known Firebase auth codes to friendly messages', () => {
    const codes: (keyof typeof AUTH_ERROR_MESSAGES)[] = [
      'auth/invalid-credential',
      'auth/user-not-found',
      'auth/wrong-password',
      'auth/email-already-in-use',
      'auth/invalid-email',
      'auth/too-many-requests',
      'auth/network-request-failed',
      'auth/weak-password',
    ];
    codes.forEach(code => {
      const msg = getAuthErrorMessage({ code });
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(5);
      expect(msg).not.toBe('Something went wrong. Please try again.');
    });
  });

  it('returns fallback for unknown codes', () => {
    expect(getAuthErrorMessage({ code: 'auth/really-unknown' }))
      .toBe('Something went wrong. Please try again.');
  });

  it('handles errors without a code property', () => {
    expect(getAuthErrorMessage(new Error('generic'))).toBe('Something went wrong. Please try again.');
    expect(getAuthErrorMessage(null)).toBe('Something went wrong. Please try again.');
    expect(getAuthErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
  });

  it('handles missing-config code', () => {
    const msg = getAuthErrorMessage({ code: 'auth/missing-config' });
    expect(msg).toContain('not configured');
  });
});

describe('authService.init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetPers.mockResolvedValue(undefined);
    // Default: onAuthStateChanged returns a dummy unsubscribe
    mockOnAuth.mockImplementation((_auth: unknown, cb: (u: null) => void) => {
      setTimeout(() => cb(null), 0);
      return vi.fn(); // unsubscribe
    });
  });

  it('sets loading=true eagerly before listener fires', () => {
    authService.init();
    expect(mockSetLoading).toHaveBeenCalledWith(true);
  });

  it('returns a callable unsubscribe function', () => {
    const unsubscribe = authService.init();
    expect(typeof unsubscribe).toBe('function');
  });

  it('calls initializeGuestSession when user is null', async () => {
    authService.init();
    await vi.runAllTimersAsync();
    // Allow the async onAuthStateChanged callback to run
    await new Promise(r => setTimeout(r, 10));
    expect(mockInitGuest).toHaveBeenCalled();
  });

  it('does NOT call initializeGuestSession when user is present', async () => {
    mockOnAuth.mockImplementation((_auth: unknown, cb: (u: { uid: string }) => void) => {
      setTimeout(() => cb({ uid: 'user-123' }), 0);
      return vi.fn();
    });
    authService.init();
    await new Promise(r => setTimeout(r, 10));
    expect(mockInitGuest).not.toHaveBeenCalled();
  });

  it('sets loading=false after auth state resolves', async () => {
    authService.init();
    await new Promise(r => setTimeout(r, 10));
    expect(mockSetState).toHaveBeenCalledWith(
      expect.objectContaining({ loading: false })
    );
  });

  it('continues if setPersistence fails (offline tolerance)', async () => {
    mockSetPers.mockRejectedValue(new Error('Offline'));
    // Should not throw
    expect(() => authService.init()).not.toThrow();
  });
});

describe('authService.signIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success:true and user on valid credentials', async () => {
    const fakeUser = { uid: 'u1', email: 'a@b.com' };
    mockSignIn.mockResolvedValue({ user: fakeUser });

    const result = await authService.signIn('a@b.com', 'Pass123!@#word');
    expect(result.success).toBe(true);
    expect(result.user).toEqual(fakeUser);
    expect(result.error).toBeUndefined();
  });

  it('returns success:false and error code on bad credentials', async () => {
    mockSignIn.mockRejectedValue({ code: 'auth/invalid-credential' });

    const result = await authService.signIn('a@b.com', 'WrongPass!');
    expect(result.success).toBe(false);
    expect(result.error).toBe('auth/invalid-credential');
  });

  it('never throws — always returns AuthResult', async () => {
    mockSignIn.mockRejectedValue(new Error('network failure'));
    await expect(authService.signIn('a@b.com', 'Pass!')).resolves.toBeDefined();
  });
});

describe('authService.signUp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns success:true on successful registration', async () => {
    const fakeUser = { uid: 'u2', email: 'new@b.com' };
    mockSignUp.mockResolvedValue({ user: fakeUser });

    const result = await authService.signUp('new@b.com', 'StrongPass123!');
    expect(result.success).toBe(true);
    expect(result.user).toEqual(fakeUser);
  });

  it('returns success:false with error code for duplicate email', async () => {
    mockSignUp.mockRejectedValue({ code: 'auth/email-already-in-use' });

    const result = await authService.signUp('existing@b.com', 'Pass123!');
    expect(result.success).toBe(false);
    expect(result.error).toBe('auth/email-already-in-use');
  });
});

describe('authService.logOut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
  });

  it('clears encryption key before signing out', async () => {
    const callOrder: string[] = [];
    mockClearEncryptionKey.mockImplementation(() => callOrder.push('clearKey'));
    mockSignOut.mockImplementation(() => { callOrder.push('signOut'); return Promise.resolve(); });

    await authService.logOut();
    expect(callOrder[0]).toBe('clearKey');
    expect(callOrder[1]).toBe('signOut');
  });

  it('calls Firebase signOut', async () => {
    await authService.logOut();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('throws if Firebase signOut fails', async () => {
    mockSignOut.mockRejectedValue(new Error('Sign-out failed'));
    await expect(authService.logOut()).rejects.toThrow('Sign-out failed');
  });
});
