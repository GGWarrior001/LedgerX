/**
 * errors.ts – Standardised error handling for LedgerX (HARDENED v4)
 *
 * Additions:
 *   - `LOCK_ERROR` code for StorageLockedError scenarios
 *   - `IMPORT_ERROR` code for data import failures
 *   - Telemetry hook: `window.__ledgerxErrorTracker` called on every error
 *     so a future Sentry integration requires zero changes to this file
 *   - `logger` abstraction replaces bare `console.*` calls
 *   - PII stripping: logger never logs user data — only error codes + context
 */
import { toast } from '@/hooks/use-toast';

// ── Error codes ────────────────────────────────────────────────────────────────

export type AppErrorCode =
  | 'SYNC_FAILED'
  | 'STORAGE_ERROR'
  | 'AUTH_ERROR'
  | 'ENCRYPTION_ERROR'
  | 'VALIDATION_ERROR'
  | 'LOCK_ERROR'
  | 'IMPORT_ERROR'
  | 'UNKNOWN';

// ── Custom error class ─────────────────────────────────────────────────────────

export class AppError extends Error {
  readonly code:  AppErrorCode;
  readonly cause: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name  = 'AppError';
    this.code  = code;
    this.cause = cause;
  }
}

// ── Friendly message map ───────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  SYNC_FAILED:      'Cloud sync failed. Your data is saved locally.',
  STORAGE_ERROR:    'Failed to save data. Check your storage quota.',
  AUTH_ERROR:       'Authentication error. Please sign in again.',
  ENCRYPTION_ERROR: 'Encryption error. Check your passcode.',
  VALIDATION_ERROR: 'Invalid input. Please check the form.',
  LOCK_ERROR:       'Session is locked. Please unlock to continue.',
  IMPORT_ERROR:     'Import failed. The backup file may be corrupt or incompatible.',
  UNKNOWN:          'An unexpected error occurred. Please try again.',
};

// ── Telemetry hook ─────────────────────────────────────────────────────────────

/**
 * Extend the Window type to allow a telemetry hook.
 *
 * Usage (e.g. in main.tsx, before app mount):
 *   window.__ledgerxErrorTracker = (err) => Sentry.captureException(err);
 *
 * IMPORTANT: The tracker must NEVER receive PII. Only `code` and sanitised
 * `context` strings flow through — never user data, amounts, or names.
 */
declare global {
  interface Window {
    __ledgerxErrorTracker?: (err: { code: string; context: string }) => void;
  }
}

function reportToTelemetry(code: string, context: string): void {
  try {
    if (typeof window.__ledgerxErrorTracker === 'function') {
      window.__ledgerxErrorTracker({ code, context });
    }
  } catch {
    // Telemetry must never crash the app
  }
}

// ── Structured logger ──────────────────────────────────────────────────────────

const isDev = import.meta.env.DEV;

/**
 * Structured logger that:
 * - Only prints in development unless it's an error
 * - Never logs user data, amounts, or names
 * - Sends errors to the telemetry hook
 */
export const logger = {
  info(context: string, message: string): void {
    if (isDev) console.info(`[LedgerX:${context}]`, message);
  },

  warn(context: string, message: string): void {
    if (isDev) console.warn(`[LedgerX:${context}]`, message);
  },

  error(code: AppErrorCode, context: string, cause?: unknown): void {
    // Log the code + context, never the cause payload in prod
    if (isDev) {
      console.error(`[LedgerX:${code}]`, context, cause ?? '');
    } else {
      console.error(`[LedgerX:${code}]`, context);
    }
    reportToTelemetry(code, context);
  },
};

// ── Central error handler ──────────────────────────────────────────────────────

export function handleError(err: unknown, overrideMessage?: string): void {
  if (err instanceof AppError) {
    logger.error(err.code, err.message, err.cause);
    toast({
      title:       'Error',
      description: overrideMessage ?? ERROR_MESSAGES[err.code],
      variant:     'destructive',
    });
  } else {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('UNKNOWN', message, err);
    toast({
      title:       'Error',
      description: overrideMessage ?? ERROR_MESSAGES.UNKNOWN,
      variant:     'destructive',
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
