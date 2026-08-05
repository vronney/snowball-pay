import { describe, expect, it } from 'vitest';
import {
  buildCashFlowCoach,
  buildCashFlowStages,
} from '@/components/progress/dataInsightsModel';
import { calculatePlanMetrics } from '@/lib/payoffPlan';
import type { Debt, Expense, Income } from '@/types';

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
    monthlyTakeHome: 0,
    essentialExpenses: 0,
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

describe('DataInsights cash-flow edge cases', () => {
  it('shows a shortfall when minimum payments exceed a small monthly income', () => {
    const debts = [
      makeDebt({ id: 'card', balance: 1_000, minimumPayment: 125 }),
      makeDebt({ id: 'loan', balance: 2_000, minimumPayment: 175 }),
    ];
    const income = makeIncome({ monthlyTakeHome: 200 });
    const expenses: Expense[] = [];

    const metrics = calculatePlanMetrics(debts, income, expenses);
    expect(metrics).not.toBeNull();
    if (!metrics) return;

    expect(metrics.totalMinPayments).toBe(300);
    expect(metrics.availableCashFlow).toBe(0);
    expect(metrics.effectiveAcceleration).toBe(0);
    expect(metrics.result.monthlyPayment).toBe(300);

    const stages = buildCashFlowStages(income, metrics);
    expect(stages.at(-1)).toMatchObject({
      label: 'Shortfall',
      amount: -100,
      fill: '#dc2626',
      helper: 'Monthly gap',
    });

    const coach = buildCashFlowCoach(income, metrics, stages);
    expect(coach.tone).toBe('danger');
    expect(coach.title).toBe('The plan is short before speed matters');
    expect(coach.evidence).toContain('$100.00 more is needed');
  });

  it('ignores the legacy extraPayment field in waterfall and calculation', () => {
    const debts = [makeDebt({ id: 'card', balance: 1_000, minimumPayment: 500 })];
    const income = makeIncome({
      monthlyTakeHome: 3_000,
      essentialExpenses: 1_000,
      extraPayment: 200,
    });
    const expenses: Expense[] = [];

    const metrics = calculatePlanMetrics(debts, income, expenses);
    expect(metrics).not.toBeNull();
    if (!metrics) return;

    // The pool is pure surplus — the retired extraPayment budget field no
    // longer inflates it, so acceleration can never exceed real cash flow.
    expect(metrics.naturalSurplus).toBe(1_500);
    expect(metrics.availableCashFlow).toBe(1_500);
    expect(metrics.effectiveAcceleration).toBe(1_500);

    // The waterfall closes exactly at zero: every surplus dollar is
    // accelerated and no phantom shortfall appears.
    const stages = buildCashFlowStages(income, metrics);
    const finalStage = stages.at(-1);
    expect(finalStage?.amount).toBe(0);
    expect(finalStage?.label).toBe('Buffer');
  });
});
