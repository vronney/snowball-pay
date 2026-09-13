import { describe, it, expect } from 'vitest';
import { computeRateWatch } from '@/lib/dashboard/rateWatch';
import { makeDebt } from './fixtures';

describe('computeRateWatch (spec §5.1, deviation X10)', () => {
  it('sums the APR-negotiation estimate over active cards above their target', () => {
    const r = computeRateWatch([
      makeDebt({ id: 'A', balance: 5000, minimumPayment: 100, interestRate: 24.99 }), // target 17.49 → ≈375
      makeDebt({ id: 'B', balance: 2000, minimumPayment: 50, interestRate: 29.99 }), // target 20.99 → ≈180
      makeDebt({ id: 'C', balance: 1000, minimumPayment: 25, interestRate: 9 }), // target = current → 0
      makeDebt({ id: 'D', balance: 10000, minimumPayment: 300, interestRate: 7, category: 'Auto Loan' }), // not a card
      makeDebt({ id: 'E', balance: 0, minimumPayment: 0, interestRate: 27 }), // paid off
    ]);
    expect(r?.cards).toBe(2);
    expect(r?.annualEstimate).toBeCloseTo(555, 5);
    expect(r?.top.debtId).toBe('B');
    expect(r?.top.debtName).toBe('B');
    expect(r?.top.apr).toBe(29.99);
    expect(r?.top.targetApr).toBe(20.99);
    expect(r?.top.annualEstimate).toBeCloseTo(180, 5);
  });

  it('is null when nothing can be negotiated', () => {
    expect(computeRateWatch([])).toBeNull();
    expect(computeRateWatch([makeDebt({ id: 'C', balance: 1000, minimumPayment: 25, interestRate: 9 })])).toBeNull();
  });

  it('uses the unrounded per-card estimate, so the sum may read $1 under the APR card (Codex P2)', () => {
    const r = computeRateWatch([
      makeDebt({ id: 'A', balance: 1010, minimumPayment: 25, interestRate: 24.99 }), // target 17.49 → 75.75 exact
      makeDebt({ id: 'B', balance: 1010, minimumPayment: 25, interestRate: 24.99 }), // target 17.49 → 75.75 exact
    ]);
    expect(r?.cards).toBe(2);
    expect(r?.annualEstimate).toBeCloseTo(151.5, 5);
    expect(r?.top.annualEstimate).toBeCloseTo(75.75, 5);
  });
});
