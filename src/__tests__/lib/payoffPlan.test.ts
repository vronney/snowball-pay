import { describe, expect, it } from 'vitest';
import {
  calculateMinimumsOnlyResult,
  calculatePlanMetrics,
  isPayoffMethod,
  methodFromIncome,
} from '@/lib/payoffPlan';
import type { Debt, Income } from '@/types';

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

function makeIncome(overrides: Partial<Income>): Income {
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
  };
}

describe('payoff plan metrics', () => {
  it('uses saved method and caps acceleration to available cash flow', () => {
    const debt = makeDebt({ id: 'card', balance: 5_000, minimumPayment: 100 });
    const income = makeIncome({
      monthlyTakeHome: 2_500,
      essentialExpenses: 2_000,
      payoffMethod: 'avalanche',
      accelerationAmount: 1_000,
    });

    const metrics = calculatePlanMetrics([debt], income, [{ amount: 200 }]);

    expect(metrics).not.toBeNull();
    if (!metrics) return;

    expect(metrics.method).toBe('avalanche');
    expect(metrics.recurringTotal).toBe(200);
    expect(metrics.totalMinPayments).toBe(100);
    expect(metrics.naturalSurplus).toBe(200);
    expect(metrics.availableCashFlow).toBe(200);
    expect(metrics.effectiveAcceleration).toBe(200);
    expect(metrics.adjustedExtra).toBe(0);
  });

  it('allows an explicit method and acceleration override', () => {
    const debt = makeDebt({ id: 'card', balance: 1_000, minimumPayment: 50 });
    const income = makeIncome({
      monthlyTakeHome: 2_000,
      essentialExpenses: 1_500,
      payoffMethod: 'snowball',
      accelerationAmount: null,
    });

    const metrics = calculatePlanMetrics([debt], income, [], {
      method: 'custom',
      accelerationAmount: 100,
    });

    expect(metrics?.method).toBe('custom');
    expect(metrics?.availableCashFlow).toBe(450);
    expect(metrics?.effectiveAcceleration).toBe(100);
    expect(metrics?.adjustedExtra).toBe(-350);
  });

  it('falls back to snowball for invalid saved methods', () => {
    const income = makeIncome({ payoffMethod: 'invalid' });

    expect(isPayoffMethod('invalid')).toBe(false);
    expect(methodFromIncome(income)).toBe('snowball');
  });

  it('calculates the minimums-only baseline from debt minimums', () => {
    const result = calculateMinimumsOnlyResult([
      makeDebt({ id: 'card', balance: 500, minimumPayment: 50 }),
      makeDebt({ id: 'loan', balance: 700, minimumPayment: 70 }),
    ]);

    expect(result.monthlyPayment).toBe(120);
    expect(result.monthlyBalances[0].totalBalance).toBe(1_200);
  });

  it('ignores paid-off debts when calculating active plan payments', () => {
    const paidOffDebt = makeDebt({
      id: 'paid-off-card',
      balance: 0,
      minimumPayment: 125,
    });
    const activeDebt = makeDebt({
      id: 'active-card',
      balance: 500,
      minimumPayment: 50,
    });
    const income = makeIncome({
      monthlyTakeHome: 1_000,
      essentialExpenses: 500,
      accelerationAmount: 0,
    });

    const metrics = calculatePlanMetrics([paidOffDebt, activeDebt], income, []);
    const minimumsOnlyResult = calculateMinimumsOnlyResult([
      paidOffDebt,
      activeDebt,
    ]);

    expect(metrics?.totalMinPayments).toBe(50);
    expect(metrics?.result.payoffSchedule).toHaveLength(1);
    expect(metrics?.result.payoffSchedule[0].debtId).toBe('active-card');
    expect(minimumsOnlyResult.monthlyPayment).toBe(50);
  });
});
