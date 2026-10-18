/**
 * src/lib/errors.ts
 *
 * Standardised error handling for LedgerX.
 *
 * Usage:
 *   import { AppError, handleError } from '@/lib/errors';
 *
 *   // Throw a typed error
 *   throw new AppError('SYNC_FAILED', 'Cloud sync failed', originalError);
 *
 *   // Catch and toast
 *   try { ... } catch (err) { handleError(err); }
 */
import { toast } from '@/hooks/use-toast';

// ── Error codes ───────────────────────────────────────────────────────────────

export type AppErrorCode =
  | 'SYNC_FAILED'
  | 'STORAGE_ERROR'
  | 'AUTH_ERROR'
  | 'ENCRYPTION_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN';

// ── Custom error class ────────────────────────────────────────────────────────

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly cause: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

// ── Friendly message map ──────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  SYNC_FAILED:       'Cloud sync failed. Your data is saved locally.',
  STORAGE_ERROR:     'Failed to save data. Check your storage quota.',
  AUTH_ERROR:        'Authentication error. Please sign in again.',
  ENCRYPTION_ERROR:  'Encryption error. Check your passcode.',
  VALIDATION_ERROR:  'Invalid input. Please check the form.',
  UNKNOWN:           'An unexpected error occurred. Please try again.',
};

// ── Central error handler ─────────────────────────────────────────────────────

/**
 * Logs the error and displays a toast notification.
 * Replaces scattered `console.error` + manual `toast.error` calls
 * across services with a single consistent pattern.
 */
export function handleError(err: unknown, overrideMessage?: string): void {
  if (err instanceof AppError) {
    console.error(`[LedgerX] ${err.code}:`, err.message, err.cause ?? '');
    toast({
      title: 'Error',
      description: overrideMessage ?? ERROR_MESSAGES[err.code],
      variant: 'destructive',
    });
  } else {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[LedgerX] Unexpected error:', message);
    toast({
      title: 'Error',
      description: overrideMessage ?? ERROR_MESSAGES.UNKNOWN,
      variant: 'destructive',
    });
  }
}

/**
 * Wraps an async operation and calls handleError on failure.
 * Returns the result or `undefined` on error.
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  code: AppErrorCode = 'UNKNOWN',
  context?: string,
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    handleError(new AppError(code, context ?? 'Operation failed', err));
    return undefined;
  }
}
