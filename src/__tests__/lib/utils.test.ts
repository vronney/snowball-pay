import { describe, expect, it } from 'vitest';
import { displayFirstName, formatCurrency, formatCurrencyWhole } from '@/lib/utils';

describe('formatCurrencyWhole', () => {
  it('renders whole dollars with no cents', () => {
    expect(formatCurrencyWhole(5573)).toBe('$5,573');
    expect(formatCurrencyWhole(0)).toBe('$0');
  });

  it('rounds to the nearest dollar', () => {
    expect(formatCurrencyWhole(5572.98)).toBe('$5,573');
    expect(formatCurrencyWhole(5572.4)).toBe('$5,572');
  });

  it('renders the same projected value identically across call sites', () => {
    // The trust-killer this fixes: one tab rounded to whole dollars ("$5,573.00")
    // while another showed cents ("$5,572.98") for the *same* estimate. Whichever
    // pre-rounding a caller passes, the projection must read the same everywhere.
    const raw = 5572.98;
    const preRounded = Math.round(raw); // 5573, as the This Month banner passes it
    expect(formatCurrencyWhole(raw)).toBe(formatCurrencyWhole(preRounded));
  });

  it('differs from formatCurrency, which keeps cents for concrete amounts', () => {
    expect(formatCurrency(5572.98)).toBe('$5,572.98');
    expect(formatCurrencyWhole(5572.98)).toBe('$5,573');
  });
});

describe('displayFirstName', () => {
  it('returns the first token of a real name', () => {
    expect(displayFirstName('Ronney Vargas')).toBe('Ronney');
    expect(displayFirstName('Madonna')).toBe('Madonna');
  });

  it('collapses surrounding and internal whitespace', () => {
    expect(displayFirstName('  Ronney   Vargas ')).toBe('Ronney');
  });

  it('treats an email-shaped value as no name (Auth0 backfills email into name)', () => {
    expect(displayFirstName('ronneyvargas@gmail.com')).toBeNull();
  });

  it('returns null for empty or missing input', () => {
    expect(displayFirstName(null)).toBeNull();
    expect(displayFirstName(undefined)).toBeNull();
    expect(displayFirstName('')).toBeNull();
    expect(displayFirstName('   ')).toBeNull();
  });
});
