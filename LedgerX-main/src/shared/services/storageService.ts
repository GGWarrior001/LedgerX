/**
 * storageService – typed localStorage wrapper (API abstraction layer).
 *
 * Re-exports the singleton `storage` instance under a stable name so that
 * the rest of the codebase only ever imports from this module, making it
 * trivial to swap the underlying storage engine in the future.
 */
import { storage } from '@/lib/storage';

/** Well-known localStorage keys used across the app. */
export const STORAGE_KEYS = {
  INVOICES:      'lx_invoices',
  EXPENSES:      'lx_expenses',
  CLIENTS:       'lx_clients',
  VENDORS:       'lx_vendors',
  PROFILE:       'lx_profile',
  NOTIFICATIONS: 'lx_notifs',
  DARK:          'lx_dark',
  SETTINGS:      'lx_settings',
  INV_ID:        'lx_inv_id',
  EXP_ID:        'lx_exp_id',
  CLIENT_ID:     'lx_cli_id',
  VENDOR_ID:     'lx_ven_id',
} as const;

export { storage as storageService };
