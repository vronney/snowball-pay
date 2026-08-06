import { describe, expect, it } from 'vitest';
import {
  calculatePlanMetrics,
  calculateResultForAcceleration,
} from '@/lib/payoffPlan';
import type { Debt, Income } from '@/types';

/**
 * PayoffTab's strategy-comparison readout puts the user's plan next to the
 * other ordering method. That side-by-side is only honest if both rows are
 * computed on the same basis — same balances, same acceleration, same start —
 * so that ordering is the ONLY variable between them.
 *
 * The trap this guards: the tab also computes a comparison for the chart from
 * *creation* balances (chartDebts), which describes a plan that started in the
 * past. Reusing that for the readout would overstate the gap against a
 * headline plan projected forward from current balances. These tests pin the
 * invariant that makes the readout's basis correct.
 */

function makeDebt(
  overrides: Partial<Debt> & { id: string; balance: number; minimumPayment: number },
): Debt {
  const { id, balance, minimumPayment, ...rest } = overrides;
  return {
    id,
    userId: 'user-1',
    name: id,
    category: 'Credit Card',
    balance,
    originalBalance: balance,
    interestRate: 0,
    minimumPayment,
    creditLimit: 0,
    priorityOrder: null,
    dueDate: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...rest,
  };
}

function makeIncome(overrides: Partial<Income> = {}): Income {
  return {
    id: 'income-1',
    userId: 'user-1',
    monthlyTakeHome: 4_000,
    essentialExpenses: 2_000,
    extraPayment: 0,
    payoffMethod: 'snowball',
    accelerationAmount: null,
    source: undefined,
    frequency: 'monthly',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Income;
}

// A small balance at a high rate vs a large balance at a low rate — the case
// where snowball and avalanche genuinely disagree about what to pay first.
const debts: Debt[] = [
  makeDebt({
    id: 'small-high-apr',
    balance: 1_200,
    originalBalance: 4_000,
    minimumPayment: 40,
    interestRate: 24.99,
  }),
  makeDebt({
    id: 'large-low-apr',
    balance: 9_000,
    originalBalance: 12_000,
    minimumPayment: 180,
    interestRate: 5.9,
  }),
];

describe('strategy comparison basis', () => {
  it('reproduces the headline plan when handed back its own method', () => {
    const income = makeIncome({ payoffMethod: 'snowball' });
    const metrics = calculatePlanMetrics(debts, income, [], { method: 'snowball' });
    expect(metrics).not.toBeNull();

    // Same call the readout makes, but asking for the method already in use.
    // If this drifts from planResult, the two rows are not comparable and the
    // readout is quietly lying about the gap.
    const echo = calculateResultForAcceleration(
      debts,
      income,
      metrics!,
      metrics!.effectiveAcceleration,
      'snowball',
    );

    expect(echo.months).toBe(metrics!.result.months);
    expect(echo.totalInterestPaid).toBeCloseTo(metrics!.result.totalInterestPaid, 2);
  });

  it('holds the basis steady while only the ordering changes', () => {
    const income = makeIncome({ payoffMethod: 'snowball' });
    const metrics = calculatePlanMetrics(debts, income, [], { method: 'snowball' });

    const alternative = calculateResultForAcceleration(
      debts,
      income,
      metrics!,
      metrics!.effectiveAcceleration,
      'avalanche',
    );

    // Both plans retire the same principal, so total paid differs only by the
    // interest each ordering accrues — the gap the readout reports.
    const principal = debts.reduce((sum, d) => sum + d.balance, 0);
    expect(metrics!.result.totalAmountPaid - metrics!.result.totalInterestPaid)
      .toBeCloseTo(principal, 0);
    expect(alternative.totalAmountPaid - alternative.totalInterestPaid)
      .toBeCloseTo(principal, 0);

    // Avalanche targets the 24.99% balance first, so it can never cost more
    // interest than snowball on the same basis. This is the directional claim
    // the readout's copy makes when it names the cheaper method.
    expect(alternative.totalInterestPaid)
      .toBeLessThanOrEqual(metrics!.result.totalInterestPaid + 0.01);
  });

  it('does not reuse the creation-balance basis the chart is drawn from', () => {
    const income = makeIncome({ payoffMethod: 'snowball' });
    const metrics = calculatePlanMetrics(debts, income, [], { method: 'snowball' });

    // What the chart feeds its comparison line: balances reset to origination.
    const chartDebts = debts.map((d) => ({ ...d, balance: d.originalBalance }));
    const chartBasis = calculateResultForAcceleration(
      chartDebts,
      income,
      metrics!,
      metrics!.effectiveAcceleration,
      'avalanche',
    );
    const currentBasis = calculateResultForAcceleration(
      debts,
      income,
      metrics!,
      metrics!.effectiveAcceleration,
      'avalanche',
    );

    // These are materially different plans. If they ever converge, this test's
    // premise is gone and the readout's source needs rechecking.
    expect(chartBasis.months).toBeGreaterThan(currentBasis.months);
  });
});
