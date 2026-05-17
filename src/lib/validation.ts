import { z } from 'zod';
import type { Client, Expense, Invoice, Profile, Vendor } from './types';

const boundedString = (max: number) => z.string().trim().max(max);
const money = z.coerce.number().finite().nonnegative().max(1_000_000_000);
const positiveId = z.coerce.number().int().positive();
const dateString = z.string().trim().max(32).refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Invalid date',
});

export const invoiceSchema = z.object({
  id: positiveId,
  number: boundedString(40),
  clientName: boundedString(160).min(1),
  clientInitials: boundedString(12),
  clientColor: boundedString(24),
  description: boundedString(500),
  issueDate: dateString,
  dueDate: dateString,
  status: z.enum(['draft', 'sent', 'paid', 'overdue']),
  amount: money,
});

export const expenseSchema = z.object({
  id: positiveId,
  description: boundedString(500).min(1),
  category: boundedString(120).min(1),
  vendor: boundedString(160).min(1),
  date: dateString,
  receipt: z.enum(['attached', 'pending']),
  amount: money,
  user_id: boundedString(160).optional(),
});

export const clientSchema = z.object({
  id: positiveId,
  name: boundedString(160).min(1),
  initials: boundedString(12),
  color: boundedString(24),
  city: boundedString(120),
  email: boundedString(254).email(),
  phone: boundedString(40),
  billed: money,
  outstanding: money,
  invoices: z.coerce.number().int().nonnegative().max(1_000_000),
});

export const vendorSchema = z.object({
  id: positiveId,
  name: boundedString(160).min(1),
  initials: boundedString(12),
  color: boundedString(24),
  city: boundedString(120),
  email: z.string().trim().max(254).refine((value) => value === '' || z.string().email().safeParse(value).success, {
    message: 'Invalid email',
  }),
  phone: boundedString(40),
  totalSpent: money,
});

export const profileSchema = z.object({
  name: boundedString(120),
  role: boundedString(80),
  city: boundedString(120),
  businessName: boundedString(160).min(1),
  fiscalYear: boundedString(20),
  currency: boundedString(8).min(1),
  dataChoice: boundedString(40),
});

export const nextIdSchema = z.coerce.number().int().positive().max(1_000_000_000);

export function sanitizeArray<T>(value: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function sanitizeProfile(value: unknown): Profile | null {
  if (value == null) return null;
  const parsed = profileSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function safeNextId(items: Array<{ id: number }>, requested: unknown): number {
  const parsed = nextIdSchema.safeParse(requested);
  const maxId = items.reduce((max, item) => Math.max(max, item.id), 0);
  return Math.max(parsed.success ? parsed.data : 1, maxId + 1);
}

export function sanitizeInvoices(value: unknown): Invoice[] {
  return sanitizeArray(value, invoiceSchema);
}

export function sanitizeExpenses(value: unknown): Expense[] {
  return sanitizeArray(value, expenseSchema);
}

export function sanitizeClients(value: unknown): Client[] {
  return sanitizeArray(value, clientSchema);
}

export function sanitizeVendors(value: unknown): Vendor[] {
  return sanitizeArray(value, vendorSchema);
}
