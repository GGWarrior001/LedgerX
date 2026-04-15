import { describe, it, expect } from 'vitest';
import { fmt, fmtDate, getInitials, currentFY, getGreeting } from '@/shared/utils/format';

describe('fmt', () => {
  it('formats numbers with Indian locale separators', () => {
    expect(fmt(125000)).toBe('1,25,000');
    expect(fmt(0)).toBe('0');
    expect(fmt(999)).toBe('999');
  });
});

describe('fmtDate', () => {
  it('formats an ISO date string', () => {
    const result = fmtDate('2025-03-28');
    expect(result).toContain('28');
    expect(result).toContain('Mar');
    expect(result).toContain('2025');
  });

  it('returns dash for empty string', () => {
    expect(fmtDate('')).toBe('—');
  });
});

describe('getInitials', () => {
  it('returns first letters of up to 2 words', () => {
    expect(getInitials('Arjun Kumar')).toBe('AK');
    expect(getInitials('TechMate Solutions')).toBe('TS');
    expect(getInitials('A')).toBe('A');
    expect(getInitials('A B C')).toBe('AB');
  });
});

describe('currentFY', () => {
  it('returns a fiscal year string', () => {
    const fy = currentFY('Apr-Mar');
    expect(fy).toMatch(/^\d{4}/);
  });

  it('handles Jan-Dec fiscal year', () => {
    const fy = currentFY('Jan-Dec');
    expect(fy).toMatch(/^\d{4}$/);
  });
});

describe('getGreeting', () => {
  it('includes the name if provided', () => {
    const greeting = getGreeting('Arjun');
    expect(greeting).toContain('Arjun');
    expect(greeting).toContain('✦');
  });

  it('works without a name', () => {
    const greeting = getGreeting('');
    expect(greeting).not.toContain(',');
    expect(greeting).toContain('✦');
  });
});
