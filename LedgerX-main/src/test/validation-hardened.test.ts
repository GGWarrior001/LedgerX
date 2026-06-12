/**
 * validation-hardened.test.ts – Phase 6 tests for hardened validation (v4)
 *
 * New coverage for v4 validation hardening:
 *   - Array size cap (MAX_ARRAY_SIZE = 10,000)
 *   - Null-byte stripping in boundedString
 *   - colorString hex validator
 *   - Strict dateString minimum length (rejects empty strings)
 *   - Dropped-item logging on invalid array entries
 *   - safeNextId floor enforcement
 *   - sanitizeProfile returns null on invalid input
 */
import { describe, it, expect, vi } from 'vitest';
import {
  sanitizeInvoices,
  sanitizeExpenses,
  sanitizeClients,
  sanitizeVendors,
  sanitizeProfile,
  safeNextId,
  sanitizeArray,
  invoiceSchema,
  expenseSchema,
  clientSchema,
  vendorSchema,
  profileSchema,
} from '@/lib/validation';

// ── Invoice schema ─────────────────────────────────────────────────────────────

describe('invoiceSchema', () => {
  const valid = {
    id: 1,
    number: 'INV-001',
    clientName: 'Acme Corp',
    clientInitials: 'AC',
    clientColor: '#3b82f6',
    description: 'Web development services',
    issueDate: '2025-01-01',
    dueDate: '2025-02-01',
    status: 'paid' as const,
    amount: 50000,
  };

  it('accepts a fully valid invoice', () => {
    expect(invoiceSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects negative amount', () => {
    expect(invoiceSchema.safeParse({ ...valid, amount: -1 }).success).toBe(false);
  });

  it('rejects amount exceeding 1,000,000,000', () => {
    expect(invoiceSchema.safeParse({ ...valid, amount: 1_000_000_001 }).success).toBe(false);
  });

  it('rejects invalid status', () => {
    expect(invoiceSchema.safeParse({ ...valid, status: 'cancelled' }).success).toBe(false);
  });

  it('rejects id = 0', () => {
    expect(invoiceSchema.safeParse({ ...valid, id: 0 }).success).toBe(false);
  });

  it('rejects empty clientName', () => {
    expect(invoiceSchema.safeParse({ ...valid, clientName: '' }).success).toBe(false);
  });

  it('rejects clientName over 160 chars', () => {
    expect(invoiceSchema.safeParse({ ...valid, clientName: 'A'.repeat(161) }).success).toBe(false);
  });

  it('trims whitespace from string fields', () => {
    const result = invoiceSchema.safeParse({ ...valid, clientName: '  Acme Corp  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.clientName).toBe('Acme Corp');
  });

  it('strips null bytes from string fields', () => {
    const result = invoiceSchema.safeParse({ ...valid, clientName: 'Acme\x00Corp' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.clientName).toBe('AcmeCorp');
  });

  it('rejects empty issueDate', () => {
    expect(invoiceSchema.safeParse({ ...valid, issueDate: '' }).success).toBe(false);
  });

  it('rejects invalid date string', () => {
    expect(invoiceSchema.safeParse({ ...valid, dueDate: 'not-a-date' }).success).toBe(false);
  });

  it('accepts all valid statuses', () => {
    const statuses = ['draft', 'sent', 'paid', 'overdue'] as const;
    for (const status of statuses) {
      expect(invoiceSchema.safeParse({ ...valid, status }).success).toBe(true);
    }
  });
});

// ── Expense schema ─────────────────────────────────────────────────────────────

describe('expenseSchema', () => {
  const valid = {
    id: 1,
    description: 'Office supplies',
    category: 'Operations',
    vendor: 'Staples',
    date: '2025-03-15',
    receipt: 'attached' as const,
    amount: 2500,
  };

  it('accepts a fully valid expense', () => {
    expect(expenseSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts expense with optional user_id', () => {
    expect(expenseSchema.safeParse({ ...valid, user_id: 'user123' }).success).toBe(true);
  });

  it('rejects invalid receipt value', () => {
    expect(expenseSchema.safeParse({ ...valid, receipt: 'lost' }).success).toBe(false);
  });

  it('rejects description over 500 chars', () => {
    expect(expenseSchema.safeParse({ ...valid, description: 'x'.repeat(501) }).success).toBe(false);
  });

  it('rejects NaN amount', () => {
    expect(expenseSchema.safeParse({ ...valid, amount: NaN }).success).toBe(false);
  });

  it('rejects Infinity amount', () => {
    expect(expenseSchema.safeParse({ ...valid, amount: Infinity }).success).toBe(false);
  });
});

// ── Client schema ──────────────────────────────────────────────────────────────

describe('clientSchema', () => {
  const valid = {
    id: 1,
    name: 'Acme Corp',
    initials: 'AC',
    color: '#3b82f6',
    city: 'Mumbai',
    email: 'billing@acme.com',
    phone: '+91-9876543210',
    billed: 100000,
    outstanding: 25000,
    invoices: 5,
  };

  it('accepts a fully valid client', () => {
    expect(clientSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(clientSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects invoices count exceeding 1,000,000', () => {
    expect(clientSchema.safeParse({ ...valid, invoices: 1_000_001 }).success).toBe(false);
  });

  it('rejects name over 160 chars', () => {
    expect(clientSchema.safeParse({ ...valid, name: 'A'.repeat(161) }).success).toBe(false);
  });
});

// ── Vendor schema ──────────────────────────────────────────────────────────────

describe('vendorSchema', () => {
  const valid = {
    id: 1,
    name: 'Tata Steel',
    initials: 'TS',
    color: '#ef4444',
    city: 'Jamshedpur',
    email: 'contact@tata.com',
    phone: '+91-657-2345678',
    totalSpent: 500000,
  };

  it('accepts a fully valid vendor', () => {
    expect(vendorSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts empty email (optional)', () => {
    expect(vendorSchema.safeParse({ ...valid, email: '' }).success).toBe(true);
  });

  it('rejects invalid email when non-empty', () => {
    expect(vendorSchema.safeParse({ ...valid, email: 'bad@@email' }).success).toBe(false);
  });

  it('rejects name over 160 chars', () => {
    expect(vendorSchema.safeParse({ ...valid, name: 'V'.repeat(161) }).success).toBe(false);
  });
});

// ── Profile schema ─────────────────────────────────────────────────────────────

describe('profileSchema', () => {
  const valid = {
    name: 'Alice',
    role: 'Admin',
    city: 'Bengaluru',
    businessName: 'LedgerX Demo',
    fiscalYear: 'Apr-Mar',
    currency: '₹',
    dataChoice: 'demo',
  };

  it('accepts a fully valid profile', () => {
    expect(profileSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty businessName', () => {
    expect(profileSchema.safeParse({ ...valid, businessName: '' }).success).toBe(false);
  });

  it('rejects empty currency', () => {
    expect(profileSchema.safeParse({ ...valid, currency: '' }).success).toBe(false);
  });

  it('rejects businessName over 160 chars', () => {
    expect(profileSchema.safeParse({ ...valid, businessName: 'B'.repeat(161) }).success).toBe(false);
  });
});

// ── sanitizeInvoices ───────────────────────────────────────────────────────────

describe('sanitizeInvoices', () => {
  const validInvoice = {
    id: 1,
    number: 'INV-001',
    clientName: 'Test',
    clientInitials: 'T',
    clientColor: '#000',
    description: 'Test',
    issueDate: '2025-01-01',
    dueDate: '2025-02-01',
    status: 'paid',
    amount: 1000,
  };

  it('returns empty array for non-array input', () => {
    expect(sanitizeInvoices(null)).toEqual([]);
    expect(sanitizeInvoices(undefined)).toEqual([]);
    expect(sanitizeInvoices('not an array')).toEqual([]);
    expect(sanitizeInvoices(42)).toEqual([]);
  });

  it('filters out invalid items, keeps valid ones', () => {
    const input = [
      validInvoice,
      { id: 'bad', amount: -1 },         // invalid
      { ...validInvoice, id: 2 },         // valid
      null,                               // invalid
    ];
    const result = sanitizeInvoices(input);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  it('trims to 10,000 items max (array size cap)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bigArray = Array.from({ length: 10_001 }, (_, i) => ({
      ...validInvoice,
      id: i + 1,
    }));
    const result = sanitizeInvoices(bigArray);
    expect(result.length).toBe(10_000);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('truncated'));
    spy.mockRestore();
  });

  it('logs warning when items are dropped', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    sanitizeInvoices([{ bad: 'data' }, validInvoice]);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('dropped'));
    spy.mockRestore();
  });

  it('returns empty array for empty input', () => {
    expect(sanitizeInvoices([])).toEqual([]);
  });
});

// ── sanitizeExpenses ───────────────────────────────────────────────────────────

describe('sanitizeExpenses', () => {
  const validExpense = {
    id: 1,
    description: 'Test',
    category: 'Test',
    vendor: 'Test',
    date: '2025-01-01',
    receipt: 'attached',
    amount: 100,
  };

  it('sanitizes valid expenses', () => {
    const result = sanitizeExpenses([validExpense]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('drops expenses with invalid amounts', () => {
    const result = sanitizeExpenses([
      { ...validExpense, amount: -100 },
      validExpense,
    ]);
    expect(result).toHaveLength(1);
  });
});

// ── sanitizeProfile ────────────────────────────────────────────────────────────

describe('sanitizeProfile', () => {
  const validProfile = {
    name: 'Alice',
    role: 'Admin',
    city: 'Delhi',
    businessName: 'LedgerX',
    fiscalYear: 'Apr-Mar',
    currency: '₹',
    dataChoice: 'custom',
  };

  it('returns parsed profile for valid input', () => {
    const result = sanitizeProfile(validProfile);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Alice');
  });

  it('returns null for null input', () => {
    expect(sanitizeProfile(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(sanitizeProfile(undefined)).toBeNull();
  });

  it('returns null for invalid profile', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = sanitizeProfile({ businessName: '', currency: '' });
    expect(result).toBeNull();
    spy.mockRestore();
  });

  it('returns null for non-object', () => {
    expect(sanitizeProfile('not an object')).toBeNull();
    expect(sanitizeProfile(42)).toBeNull();
  });
});

// ── safeNextId ─────────────────────────────────────────────────────────────────

describe('safeNextId', () => {
  it('returns max(items)+1 when requested id is lower', () => {
    const items = [{ id: 5 }, { id: 10 }, { id: 3 }];
    expect(safeNextId(items, 1)).toBe(11);
  });

  it('returns requested id when it exceeds max item id', () => {
    const items = [{ id: 1 }, { id: 2 }];
    expect(safeNextId(items, 50)).toBe(50);
  });

  it('returns 1 for empty array with no requested id', () => {
    expect(safeNextId([], undefined)).toBe(1);
  });

  it('returns 1 for empty array with invalid requested id', () => {
    expect(safeNextId([], -5)).toBe(1);
    expect(safeNextId([], 'bad' as unknown as number)).toBe(1);
  });

  it('handles floating-point requested id by rounding', () => {
    const result = safeNextId([], 3.7);
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it('returns at least 1 for empty collection', () => {
    expect(safeNextId([], 0)).toBe(1);
    expect(safeNextId([], null as unknown as number)).toBe(1);
  });
});

// ── Null-byte injection prevention ────────────────────────────────────────────

describe('null-byte stripping', () => {
  it('strips null bytes from invoice clientName', () => {
    const invoice = {
      id: 1,
      number: 'INV-001',
      clientName: 'Acme\x00Corp',
      clientInitials: 'AC',
      clientColor: '#000',
      description: 'Test',
      issueDate: '2025-01-01',
      dueDate: '2025-02-01',
      status: 'paid',
      amount: 1000,
    };
    const result = sanitizeInvoices([invoice]);
    expect(result).toHaveLength(1);
    expect(result[0].clientName).toBe('AcmeCorp');
    expect(result[0].clientName).not.toContain('\x00');
  });

  it('strips null bytes from expense description', () => {
    const expense = {
      id: 1,
      description: 'Office\x00Supplies',
      category: 'Ops',
      vendor: 'Vendor',
      date: '2025-01-01',
      receipt: 'attached',
      amount: 500,
    };
    const result = sanitizeExpenses([expense]);
    expect(result).toHaveLength(1);
    expect(result[0].description).not.toContain('\x00');
  });
});
