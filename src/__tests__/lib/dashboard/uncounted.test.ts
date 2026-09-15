import { describe, expect, it } from 'vitest';
import { computeUncounted } from '@/lib/dashboard/uncounted';
import { calculatePlanMetrics } from '@/lib/payoffPlan';
import { makeDebt, makeIncome } from './fixtures';

const INCOME = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, accelerationAmount: 300 });
const COUNTED = [
  makeDebt({ id: 'a', balance: 2_000, minimumPayment: 60, interestRate: 20 }),
  makeDebt({ id: 'b', balance: 6_000, minimumPayment: 150, interestRate: 9 }),
];
const OUTSIDE = makeDebt({ id: 'x', balance: 4_500, minimumPayment: 120, interestRate: 24, inPlan: false });

describe('computeUncounted (spec §5.1)', () => {
  it('is null when every debt counts', () => {
    expect(computeUncounted(COUNTED, INCOME, [])).toBeNull();
  });

  it('counts active outside debts and their balance, not a paid-off one', () => {
    const paidOff = makeDebt({ id: 'y', balance: 0, minimumPayment: 40, inPlan: false });
    expect(computeUncounted([...COUNTED, OUTSIDE, paidOff], INCOME, [])).toMatchObject({ count: 1, balance: 4_500 });
  });

  it('measures monthsImpact as the plan with every debt counted minus the current plan', () => {
    const current = calculatePlanMetrics(COUNTED, INCOME, [])!;
    const all = calculatePlanMetrics([...COUNTED, { ...OUTSIDE, inPlan: true }], INCOME, [])!;
    const out = computeUncounted([...COUNTED, OUTSIDE], INCOME, []);
    expect(out?.monthsImpact).toBe(all.result.months - current.result.months);
    expect(out?.monthsImpact).toBeGreaterThan(0);
  });

  it('has no monthsImpact without income', () => {
    expect(computeUncounted([...COUNTED, OUTSIDE], null, [])).toEqual({ count: 1, balance: 4_500, monthsImpact: null });
  });

  it('has no monthsImpact when counting every debt would hit the 360-month cap', () => {
    // Its minimum is below its monthly interest (1,800), so counted, the run never pays off.
    const huge = makeDebt({ id: 'h', balance: 90_000, minimumPayment: 1_500, interestRate: 24, inPlan: false });
    const minimumsOnly = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, accelerationAmount: 0 });
    expect(computeUncounted([...COUNTED, huge], minimumsOnly, [])?.monthsImpact).toBeNull();
  });
});
