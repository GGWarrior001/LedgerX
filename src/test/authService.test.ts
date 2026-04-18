import { describe, it, expect } from 'vitest';
import { getAuthErrorMessage, AUTH_ERROR_MESSAGES } from '@/features/auth/services/authService';

describe('getAuthErrorMessage', () => {
  it('maps known Firebase auth errors to friendly messages', () => {
    expect(getAuthErrorMessage({ code: 'auth/invalid-credential' })).toBe(
      AUTH_ERROR_MESSAGES['auth/invalid-credential']
    );
    expect(getAuthErrorMessage({ code: 'auth/too-many-requests' })).toBe(
      AUTH_ERROR_MESSAGES['auth/too-many-requests']
    );
  });

  it('returns a fallback for unknown error codes', () => {
    expect(getAuthErrorMessage({ code: 'auth/unknown' })).toBe(
      'Something went wrong. Please try again.'
    );
  });

  it('handles errors without a code property', () => {
    expect(getAuthErrorMessage(new Error('random'))).toBe(
      'Something went wrong. Please try again.'
    );
  });
});
