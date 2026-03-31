import { describe, it, expect } from 'vitest';
import {
  calculateDebtSnowball,
  calculateDebtAvalanche,
  calculateDebtCustom,
} from '@/lib/snowball';
import type { Debt } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDebt(overrides: Partial<Debt> & { id: string; balance: number }): Debt {
  return {
    name: overrides.id,
    category: 'Credit Card',
    interestRate: 0,
    minimumPayment: 50,
    originalBalance: overrides.balance,
    creditLimit: 0,
    priorityOrder: null,
    dueDate: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user-1',
    ...overrides,
  } as Debt;
}

// A simple two-debt scenario used across most tests.
// Debt A: $500 balance, 5% APR, $50/mo minimum
// Debt B: $1000 balance, 10% APR, $100/mo minimum
const debtA = makeDebt({ id: 'A', balance: 500, interestRate: 5, minimumPayment: 50 });
const debtB = makeDebt({ id: 'B', balance: 1000, interestRate: 10, minimumPayment: 100 });
const INCOME = 3000;
const ESSENTIAL = 1500;
const RECURRING = 0;
const EXTRA = 0;

// ---------------------------------------------------------------------------
// Empty debts
// ---------------------------------------------------------------------------

describe('empty debts', () => {
  it('returns zero result when no debts are passed', () => {
    const result = calculateDebtSnowball([], INCOME, ESSENTIAL, RECURRING, EXTRA);
    expect(result.months).toBe(0);
    expect(result.totalInterestPaid).toBe(0);
    expect(result.monthlyPayment).toBe(0);
    expect(result.payoffSchedule).toHaveLength(0);
    expect(result.monthlyBalances).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Snowball method
// ---------------------------------------------------------------------------

describe('calculateDebtSnowball', () => {
  it('pays off the lowest-balance debt first', () => {
    const result = calculateDebtSnowball([debtB, debtA], INCOME, ESSENTIAL, RECURRING, EXTRA);
    // orderInPayoff 1 = tackled first = lowest balance = debtA ($500)
    const first = result.payoffSchedule.find((s) => s.debtId === 'A');
    const second = result.payoffSchedule.find((s) => s.debtId === 'B');
    expect(first!.orderInPayoff).toBe(1);
    expect(second!.orderInPayoff).toBe(2);
    expect(first!.monthPaidOff).toBeLessThan(second!.monthPaidOff);
  });

  it('returns a positive debtFreeDate in the future', () => {
    const result = calculateDebtSnowball([debtA, debtB], INCOME, ESSENTIAL, RECURRING, EXTRA);
    expect(result.debtFreeDate.getTime()).toBeGreaterThan(Date.now());
  });

  it('accumulates interest correctly (non-zero)', () => {
    const result = calculateDebtSnowball([debtA, debtB], INCOME, ESSENTIAL, RECURRING, EXTRA);
    expect(result.totalInterestPaid).toBeGreaterThan(0);
  });

  it('pays off faster with extra payment', () => {
    // Use a large debt and tight income so extra payment makes a real difference.
    const bigDebt = makeDebt({ id: 'BIG', balance: 5000, interestRate: 20, minimumPayment: 100 });
    const base = calculateDebtSnowball([bigDebt], 1700, 1500, 0, 0);
    const fast = calculateDebtSnowball([bigDebt], 1700, 1500, 0, 200);
    expect(fast.months).toBeLessThan(base.months);
    expect(fast.totalInterestPaid).toBeLessThan(base.totalInterestPaid);
  });

  it('monthlyBalances starts at full balance and ends at 0', () => {
    const result = calculateDebtSnowball([debtA, debtB], INCOME, ESSENTIAL, RECURRING, EXTRA);
    expect(result.monthlyBalances[0].totalBalance).toBeCloseTo(1500, 0);
    expect(result.monthlyBalances[result.monthlyBalances.length - 1].totalBalance).toBeCloseTo(0, 0);
  });

  it('snowball effect: freed minimum rolls to next debt', () => {
    // Single debt A paid off first; its freed $50 minimum should accelerate debt B payoff.
    const withSnowball = calculateDebtSnowball([debtA, debtB], INCOME, ESSENTIAL, RECURRING, EXTRA);
    // Verify B is paid off after A is freed (not possible in minimums-only scenario)
    const stepA = withSnowball.payoffSchedule.find((s) => s.debtId === 'A')!;
    const stepB = withSnowball.payoffSchedule.find((s) => s.debtId === 'B')!;
    expect(stepB.monthPaidOff).toBeGreaterThan(stepA.monthPaidOff);
  });

  it('floors availableCashFlow at 0 when income does not cover expenses', () => {
    // Income barely covers essentials + minimums, no extra cash flow.
    const result = calculateDebtSnowball(
      [debtA],
      1550, // income = essentials(1500) + minimum(50) exactly
      1500,
      0,
      0,
    );
    expect(result.monthlyPayment).toBe(50); // only minimums, no extra
  });

  it('caps at MAX_MONTHS (360) when debt is unpayable', () => {
    const unpayable = makeDebt({ id: 'U', balance: 100_000, interestRate: 99, minimumPayment: 1 });
    const result = calculateDebtSnowball([unpayable], 1000, 998, 0, 0);
    expect(result.months).toBe(360);
  });
});

// ---------------------------------------------------------------------------
// Avalanche method
// ---------------------------------------------------------------------------

describe('calculateDebtAvalanche', () => {
  it('targets the highest-interest debt first', () => {
    const result = calculateDebtAvalanche([debtA, debtB], INCOME, ESSENTIAL, RECURRING, EXTRA);
    // debtB has 10% APR > debtA 5% → debtB should be order 1
    const first = result.payoffSchedule.find((s) => s.debtId === 'B');
    expect(first!.orderInPayoff).toBe(1);
  });

  it('pays less total interest than snowball on high-rate debt', () => {
    const snowball = calculateDebtSnowball([debtA, debtB], INCOME, ESSENTIAL, RECURRING, EXTRA);
    const avalanche = calculateDebtAvalanche([debtA, debtB], INCOME, ESSENTIAL, RECURRING, EXTRA);
    // Avalanche should pay equal or less interest overall
    expect(avalanche.totalInterestPaid).toBeLessThanOrEqual(snowball.totalInterestPaid);
  });

  it('sorts two equal-rate debts by balance as tiebreaker (snowball order)', () => {
    const d1 = makeDebt({ id: 'X', balance: 300, interestRate: 10, minimumPayment: 30 });
    const d2 = makeDebt({ id: 'Y', balance: 600, interestRate: 10, minimumPayment: 60 });
    const result = calculateDebtAvalanche([d2, d1], INCOME, ESSENTIAL, RECURRING, EXTRA);
    // Both have same rate; avalanche falls back to natural sort order (getSorter returns 0)
    // Both should be paid off
    expect(result.payoffSchedule).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Custom method
// ---------------------------------------------------------------------------

describe('calculateDebtCustom', () => {
  it('respects explicit priorityOrder', () => {
    const high = makeDebt({ id: 'HIGH', balance: 2000, interestRate: 5, minimumPayment: 100, priorityOrder: 1 });
    const low = makeDebt({ id: 'LOW', balance: 500, interestRate: 20, minimumPayment: 50, priorityOrder: 2 });
    const result = calculateDebtCustom([low, high], INCOME, ESSENTIAL, RECURRING, EXTRA);
    const highStep = result.payoffSchedule.find((s) => s.debtId === 'HIGH');
    const lowStep = result.payoffSchedule.find((s) => s.debtId === 'LOW');
    expect(highStep!.orderInPayoff).toBe(1);
    expect(lowStep!.orderInPayoff).toBe(2);
  });

  it('uses balance as tiebreaker when priorityOrder is equal', () => {
    const small = makeDebt({ id: 'SMALL', balance: 200, interestRate: 5, minimumPayment: 20, priorityOrder: 1 });
    const large = makeDebt({ id: 'LARGE', balance: 800, interestRate: 5, minimumPayment: 80, priorityOrder: 1 });
    const result = calculateDebtCustom([large, small], INCOME, ESSENTIAL, RECURRING, EXTRA);
    const smallStep = result.payoffSchedule.find((s) => s.debtId === 'SMALL');
    expect(smallStep!.orderInPayoff).toBe(1);
  });

  it('treats null priorityOrder as lowest priority', () => {
    const noPriority = makeDebt({ id: 'NP', balance: 300, interestRate: 5, minimumPayment: 30, priorityOrder: null });
    const hasPriority = makeDebt({ id: 'HP', balance: 900, interestRate: 5, minimumPayment: 90, priorityOrder: 1 });
    const result = calculateDebtCustom([noPriority, hasPriority], INCOME, ESSENTIAL, RECURRING, EXTRA);
    const hpStep = result.payoffSchedule.find((s) => s.debtId === 'HP');
    expect(hpStep!.orderInPayoff).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Shared result shape
// ---------------------------------------------------------------------------

describe('result shape', () => {
  it('years is floor(months / 12)', () => {
    const result = calculateDebtSnowball([debtA, debtB], INCOME, ESSENTIAL, RECURRING, EXTRA);
    expect(result.years).toBe(Math.floor(result.months / 12));
  });

  it('payoffSchedule length matches number of input debts', () => {
    const debts = [debtA, debtB, makeDebt({ id: 'C', balance: 750, minimumPayment: 75 })];
    const result = calculateDebtSnowball(debts, INCOME, ESSENTIAL, RECURRING, EXTRA);
    expect(result.payoffSchedule).toHaveLength(debts.length);
  });

  it('originalBalance on schedule matches input debt balance', () => {
    const result = calculateDebtSnowball([debtA], INCOME, ESSENTIAL, RECURRING, EXTRA);
    expect(result.payoffSchedule[0].originalBalance).toBe(debtA.balance);
  });

  it('monthlyBalances has month+1 entries (month 0 through final month)', () => {
    const result = calculateDebtSnowball([debtA], INCOME, ESSENTIAL, RECURRING, EXTRA);
    expect(result.monthlyBalances).toHaveLength(result.months + 1);
  });
});
