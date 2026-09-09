import { describe, expect, it } from 'vitest';
import { indexByUniqueFallbackKey, plaidFallbackMatchKey } from '@/lib/plaid';

interface Row {
  id: string;
  institutionId: string | null;
  mask: string | null;
  category: string | null;
}

const keyOf = (r: Row) => plaidFallbackMatchKey(r.institutionId, r.mask, r.category);
const row = (id: string, institutionId: string | null, mask: string | null, category: string | null): Row =>
  ({ id, institutionId, mask, category });

/**
 * The fallback key is not unique by construction. These cover the case
 * CodeRabbit flagged on PR #101: two same-category cards at one institution
 * sharing a mask must NOT let a re-link attach an incoming account to an
 * arbitrarily chosen debt and overwrite its balance.
 */
describe('indexByUniqueFallbackKey', () => {
  it('indexes a row whose key nothing else claims', () => {
    const a = row('a', 'ins_7', '4021', 'Credit Card');
    const index = indexByUniqueFallbackKey([a], keyOf);
    expect(index.get('ins_7|4021|credit card')).toBe(a);
  });

  it('DROPS a key two rows share, so the lookup misses instead of guessing', () => {
    const a = row('a', 'ins_7', '4021', 'Credit Card');
    const b = row('b', 'ins_7', '4021', 'Credit Card');
    const index = indexByUniqueFallbackKey([a, b], keyOf);
    expect(index.get('ins_7|4021|credit card')).toBeUndefined();
    expect(index.size).toBe(0);
  });

  it('drops an ambiguous key regardless of row order', () => {
    const a = row('a', 'ins_7', '4021', 'Credit Card');
    const b = row('b', 'ins_7', '4021', 'Credit Card');
    expect(indexByUniqueFallbackKey([a, b], keyOf).size).toBe(0);
    expect(indexByUniqueFallbackKey([b, a], keyOf).size).toBe(0);
  });

  it('keeps unambiguous rows even when a different key is ambiguous', () => {
    const dupA = row('dupA', 'ins_7', '4021', 'Credit Card');
    const dupB = row('dupB', 'ins_7', '4021', 'Credit Card');
    const unique = row('unique', 'ins_7', '9987', 'Credit Card');
    const index = indexByUniqueFallbackKey([dupA, dupB, unique], keyOf);
    expect(index.size).toBe(1);
    expect(index.get('ins_7|9987|credit card')).toBe(unique);
  });

  it('drops three-way collisions too, not just pairs', () => {
    const rows = ['a', 'b', 'c'].map((id) => row(id, 'ins_7', '4021', 'Credit Card'));
    expect(indexByUniqueFallbackKey(rows, keyOf).size).toBe(0);
  });

  it('ignores rows with no usable key, and does not let them collide', () => {
    // Two rows both keying to null must not be treated as sharing a key.
    const a = row('a', null, '4021', 'Credit Card');
    const b = row('b', 'ins_7', null, 'Credit Card');
    const good = row('good', 'ins_10', '1234', 'Auto Loan');
    const index = indexByUniqueFallbackKey([a, b, good], keyOf);
    expect(index.size).toBe(1);
    expect(index.get('ins_10|1234|auto loan')).toBe(good);
  });

  it('separates same mask at different institutions', () => {
    const usaa = row('usaa', 'ins_7', '4021', 'Credit Card');
    const amex = row('amex', 'ins_10', '4021', 'Credit Card');
    const index = indexByUniqueFallbackKey([usaa, amex], keyOf);
    expect(index.size).toBe(2);
    expect(index.get('ins_7|4021|credit card')).toBe(usaa);
    expect(index.get('ins_10|4021|credit card')).toBe(amex);
  });

  it('returns an empty index for no rows', () => {
    expect(indexByUniqueFallbackKey([], keyOf).size).toBe(0);
  });
});
