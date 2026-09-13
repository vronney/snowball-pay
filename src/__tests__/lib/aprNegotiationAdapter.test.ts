import { describe, it, expect } from 'vitest';
import {
  computeRateTargets,
  estimateAnnualSavings,
  estimateAnnualSavingsExact,
} from '@/lib/apr-negotiation/apr-negotiation-adapter';

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
  it('stays unchanged (pins the APR card) — rounds 75.75 up to 76', () => {
    expect(estimateAnnualSavings(1010, 24.99, 17.49)).toBe(76);
  });
});

describe('estimateAnnualSavingsExact (rate watch, unrounded)', () => {
  it('is balance × (current − target) / 100, unrounded', () => {
    expect(estimateAnnualSavingsExact(1010, 24.99, 17.49)).toBeCloseTo(75.75, 5);
  });
  it('is 0 when the target is not below the current rate', () => {
    expect(estimateAnnualSavingsExact(5000, 9.99, 9.99)).toBe(0);
    expect(estimateAnnualSavingsExact(5000, 9, 12)).toBe(0);
  });
  it('is null for non-finite input', () => {
    expect(estimateAnnualSavingsExact(Number.NaN, 20, 14)).toBeNull();
    expect(estimateAnnualSavingsExact(1000, Number.POSITIVE_INFINITY, 14)).toBeNull();
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
