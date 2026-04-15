/**
 * Auth service — orchestrates auth operations with error mapping.
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
};

/** Maps a Firebase Auth error to a user-friendly message. */
export function getAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  return AUTH_ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.';
}
