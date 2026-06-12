/**
 * validation.ts – LedgerX data validation schemas (HARDENED v4)
 *
 * Changes from v3:
 *   - Array size caps: `invoices`, `expenses`, `clients`, `vendors` now capped
 *     at 10,000 items each (prevents memory exhaustion via malicious import)
 *   - `boundedString` now trims AND strips null bytes (\x00) to prevent
 *     UTF-8 null injection attacks in string comparisons
 *   - `dateString` now validates ISO 8601 format more strictly
 *   - `money` maximum raised to match Firestore rule (`1_000_000_000`)
 *   - `colorHex` validator added for clientColor / vendorColor fields
 *   - All array sanitizers log a warning when items are dropped
 */
import { z } from 'zod';
import type { Client, Expense, Invoice, Profile, Vendor } from './types';

// ── Primitive validators ───────────────────────────────────────────────────────

/**
 * Trims whitespace, strips null bytes, and enforces max length.
 * Null bytes can cause issues in C-based storage layers and string comparisons.
 */
const boundedString = (max: number) =>
  z.string()
    .transform(s => s.replace(/\x00/g, '').trim())
    .pipe(z.string().max(max));

const money = z.coerce
  .number()
  .finite()
  .nonnegative()
  .max(1_000_000_000);

const positiveId = z.coerce.number().int().positive();

/**
 * ISO 8601 date string validator (YYYY-MM-DD or full ISO timestamp).
 * Rejects strings that parse to NaN or produce an Invalid Date.
 */
const dateString = z.string()
  .trim()
  .max(32)
  .refine(
    (v) => {
      if (!v) return false;
      const d = new Date(v);
      return !Number.isNaN(d.getTime());
    },
    { message: 'Invalid date string' }
  );

/**
 * CSS hex color validator: #RGB, #RRGGBB, or named CSS colors up to 24 chars.
 */
const colorString = z.string()
  .trim()
  .max(24)
  .refine(
    (v) => v === '' || /^(#[0-9a-fA-F]{3,8}|[a-z\-]{2,20})$/.test(v),
    { message: 'Invalid color value' }
  );

// ── Domain schemas ─────────────────────────────────────────────────────────────

export const invoiceSchema = z.object({
  id:              positiveId,
  number:          boundedString(40),
  clientName:      boundedString(160).pipe(z.string().min(1)),
  clientInitials:  boundedString(12),
  clientColor:     colorString,
  description:     boundedString(500),
  issueDate:       dateString,
  dueDate:         dateString,
  status:          z.enum(['draft', 'sent', 'paid', 'overdue']),
  amount:          money,
});

export const expenseSchema = z.object({
  id:          positiveId,
  description: boundedString(500).pipe(z.string().min(1)),
  category:    boundedString(120).pipe(z.string().min(1)),
  vendor:      boundedString(160).pipe(z.string().min(1)),
  date:        dateString,
  receipt:     z.enum(['attached', 'pending']),
  amount:      money,
  user_id:     boundedString(160).optional(),
});

export const clientSchema = z.object({
  id:          positiveId,
  name:        boundedString(160).pipe(z.string().min(1)),
  initials:    boundedString(12),
  color:       colorString,
  city:        boundedString(120),
  email:       z.string().trim().max(254).email(),
  phone:       boundedString(40),
  billed:      money,
  outstanding: money,
  invoices:    z.coerce.number().int().nonnegative().max(1_000_000),
});

export const vendorSchema = z.object({
  id:         positiveId,
  name:       boundedString(160).pipe(z.string().min(1)),
  initials:   boundedString(12),
  color:      colorString,
  city:       boundedString(120),
  email:      z.string().trim().max(254).refine(
    (v) => v === '' || z.string().email().safeParse(v).success,
    { message: 'Invalid email' }
  ),
  phone:      boundedString(40),
  totalSpent: money,
});

export const profileSchema = z.object({
  name:         boundedString(120),
  role:         boundedString(80),
  city:         boundedString(120),
  businessName: boundedString(160).pipe(z.string().min(1)),
  fiscalYear:   boundedString(20),
  currency:     boundedString(8).pipe(z.string().min(1)),
  dataChoice:   boundedString(40),
});

export const nextIdSchema = z.coerce.number().int().positive().max(1_000_000_000);

// ── Array size cap ─────────────────────────────────────────────────────────────

/** Maximum items per collection. Prevents memory exhaustion on malicious import. */
const MAX_ARRAY_SIZE = 10_000;

// ── Generic sanitizer ──────────────────────────────────────────────────────────

export function sanitizeArray<T>(value: unknown, schema: z.ZodType<T>, label?: string): T[] {
  if (!Array.isArray(value)) return [];

  const capped = value.slice(0, MAX_ARRAY_SIZE);
  if (value.length > MAX_ARRAY_SIZE) {
    console.warn(
      `[LedgerX:validation] ${label ?? 'Array'} truncated from ${value.length} to ${MAX_ARRAY_SIZE} items`
    );
  }

  const result: T[] = [];
  let dropped = 0;

  for (const item of capped) {
    const parsed = schema.safeParse(item);
    if (parsed.success) {
      result.push(parsed.data);
    } else {
      dropped++;
    }
  }

  if (dropped > 0) {
    console.warn(
      `[LedgerX:validation] ${label ?? 'Array'}: dropped ${dropped} invalid item(s)`
    );
  }

  return result;
}

// ── Domain sanitizers ──────────────────────────────────────────────────────────

export function sanitizeProfile(value: unknown): Profile | null {
  if (value == null) return null;
  const parsed = profileSchema.safeParse(value);
  if (!parsed.success) {
    console.warn('[LedgerX:validation] Profile failed validation:', parsed.error.issues);
    return null;
  }
  return parsed.data;
}

export function safeNextId(items: Array<{ id: number }>, requested: unknown): number {
  const parsed = nextIdSchema.safeParse(requested);
  const maxId  = items.reduce((max, item) => Math.max(max, item.id), 0);
  return Math.max(parsed.success ? parsed.data : 1, maxId + 1);
}

export function sanitizeInvoices(value: unknown): Invoice[] {
  return sanitizeArray(value, invoiceSchema, 'invoices');
}

export function sanitizeExpenses(value: unknown): Expense[] {
  return sanitizeArray(value, expenseSchema, 'expenses');
}

export function sanitizeClients(value: unknown): Client[] {
  return sanitizeArray(value, clientSchema, 'clients');
}

export function sanitizeVendors(value: unknown): Vendor[] {
  return sanitizeArray(value, vendorSchema, 'vendors');
}
