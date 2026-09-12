import { describe, it, expect } from 'vitest';
import { computeMonthlyInterest } from '@/lib/dashboard/interest';
import { makeDebt, makeResult } from './fixtures';

// Legacy copies of usePlannerComputed L90-101 (938a0f45).
const legacyLeak = (debts: { balance: number; interestRate: number }[]) =>
  debts.filter((d) => d.balance > 0.01).reduce((sum, d) => sum + ((d.balance * d.interestRate) / 100) / 12, 0);
const legacyAvoided = (minTotal: number, planTotal: number, planMonths: number) => {
  const totalSaved = Math.max(0, minTotal - planTotal);
  return planMonths > 0 ? totalSaved / planMonths : 0;
};

const DEBTS = [
  makeDebt({ id: 'a', balance: 1000, minimumPayment: 25, interestRate: 24 }), // 20.00/mo
  makeDebt({ id: 'b', balance: 2000, minimumPayment: 40, interestRate: 12 }), // 20.00/mo
  makeDebt({ id: 'c', balance: 0, minimumPayment: 0, interestRate: 30 }), // paid off: excluded
];

describe('computeMonthlyInterest (spec §5.1, deviation X1/X2)', () => {
  it('estimates this month as the sum of balance × APR ÷ 12 over active debts (legacy formula)', () => {
    const r = computeMonthlyInterest(DEBTS, null, null);
    expect(r?.monthlyEstimate).toBeCloseTo(40, 10);
    expect(r?.monthlyEstimate).toBe(legacyLeak(DEBTS));
    expect(r?.avgMonthlySavedByPlan).toBeNull();
  });

  it('averages lifetime savings vs minimums over plan months (legacy formula)', () => {
    const plan = makeResult([['Sep 2026', 3000]], { months: 10, totalInterestPaid: 500 });
    const minimums = makeResult([['Sep 2026', 3000]], { months: 30, totalInterestPaid: 800 });
    const r = computeMonthlyInterest(DEBTS, plan, minimums);
    expect(r?.avgMonthlySavedByPlan).toBe(legacyAvoided(800, 500, 10));
    expect(r?.avgMonthlySavedByPlan).toBe(30);
  });

  it('hides the average instead of showing $0', () => {
    const plan = makeResult([['Sep 2026', 3000]], { months: 10, totalInterestPaid: 800 });
    const minimums = makeResult([['Sep 2026', 3000]], { months: 10, totalInterestPaid: 800 });
    expect(computeMonthlyInterest(DEBTS, plan, minimums)?.avgMonthlySavedByPlan).toBeNull();
    const zeroMonths = makeResult([['Sep 2026', 0]], { months: 0 });
    expect(computeMonthlyInterest(DEBTS, zeroMonths, minimums)?.avgMonthlySavedByPlan).toBeNull();
  });

  it('is null when there is no interest to show', () => {
    expect(computeMonthlyInterest([], null, null)).toBeNull();
    expect(computeMonthlyInterest([makeDebt({ id: 'z', balance: 500, minimumPayment: 10, interestRate: 0 })], null, null)).toBeNull();
  });
});
