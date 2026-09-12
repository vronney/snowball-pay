import { describe, it, expect } from 'vitest';
import { computeRateTargets, estimateAnnualSavings } from '@/lib/apr-negotiation/apr-negotiation-adapter';

describe('estimateAnnualSavings (moved verbatim from useAprNegotiation)', () => {
  it('is balance × (current − target) / 100, rounded', () => {
    expect(estimateAnnualSavings(5000, 24.99, 17.49)).toBe(375);
  });
  it('is 0 when the target is not below the current rate', () => {
    expect(estimateAnnualSavings(5000, 9.99, 9.99)).toBe(0);
    expect(estimateAnnualSavings(5000, 9, 12)).toBe(0);
  });
  it('is null for non-finite input', () => {
    expect(estimateAnnualSavings(Number.NaN, 20, 14)).toBeNull();
    expect(estimateAnnualSavings(1000, Number.POSITIVE_INFINITY, 14)).toBeNull();
  });
});

describe('computeRateTargets (unchanged, pinned for rate watch)', () => {
  it('asks for ~30% off with a 9.99% floor, never above current', () => {
    expect(computeRateTargets(30).targetApr).toBe('21');
    expect(computeRateTargets(12).targetApr).toBe('9.99');
    expect(computeRateTargets(8).targetApr).toBe('8');
    expect(computeRateTargets(0).targetApr).toBe('');
  });
});
