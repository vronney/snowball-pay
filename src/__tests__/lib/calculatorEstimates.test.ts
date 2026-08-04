import { describe, expect, it } from 'vitest';
import {
  ESTIMATED_APR_BY_CATEGORY,
  estimateMinimumPayment,
  estimateDisclosure,
} from '@/lib/calculatorEstimates';

describe('ESTIMATED_APR_BY_CATEGORY', () => {
  it('covers every debt category with a non-negative rate', () => {
    for (const [category, apr] of Object.entries(ESTIMATED_APR_BY_CATEGORY)) {
      expect(apr, category).toBeGreaterThanOrEqual(0);
      expect(apr, category).toBeLessThan(40);
    }
  });

  it('estimates credit cards at the national-average card APR', () => {
    expect(ESTIMATED_APR_BY_CATEGORY['Credit Card']).toBe(24.99);
  });
});

describe('estimateMinimumPayment', () => {
  it('uses ~2% of balance', () => {
    expect(estimateMinimumPayment(10000)).toBe(200);
    expect(estimateMinimumPayment(5000)).toBe(100);
  });

  it('applies the $25 floor for small balances', () => {
    expect(estimateMinimumPayment(500)).toBe(25);
    expect(estimateMinimumPayment(100)).toBe(25);
  });

  it('returns 0 for a non-positive balance', () => {
    expect(estimateMinimumPayment(0)).toBe(0);
    expect(estimateMinimumPayment(-100)).toBe(0);
  });
});

describe('estimateDisclosure', () => {
  it('names the category APR used', () => {
    expect(estimateDisclosure('Credit Card')).toContain('24.99%');
  });
});
