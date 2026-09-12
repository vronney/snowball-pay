import { describe, it, expect } from 'vitest';
import { calculatePlanMetrics, calculateResultForAcceleration } from '@/lib/payoffPlan';
import { computeStrategyComparison } from '@/lib/dashboard/strategy';
import { makeDebt, makeIncome } from './fixtures';

// Snowball pays the small low-APR debt first; avalanche pays the high-APR one first.
const DEBTS = [
  makeDebt({ id: 'small', balance: 1000, minimumPayment: 30, interestRate: 5 }),
  makeDebt({ id: 'big', balance: 3000, minimumPayment: 60, interestRate: 25 }),
];

describe('computeStrategyComparison (mirrors PayoffTab.tsx:258-270)', () => {
  it('compares snowball against avalanche with the same acceleration', () => {
    const income = makeIncome({ monthlyTakeHome: 3000, essentialExpenses: 2400, payoffMethod: 'snowball' });
    const metrics = calculatePlanMetrics(DEBTS, income, [])!;
    const legacyAlt = calculateResultForAcceleration(DEBTS, income, metrics, metrics.effectiveAcceleration, 'avalanche');
    const s = computeStrategyComparison(DEBTS, income, metrics)!;
    expect(s.current).toBe('snowball');
    expect(s.alternative).toBe('avalanche');
    expect(s.currentInterest).toBe(metrics.result.totalInterestPaid);
    expect(s.alternativeInterest).toBe(legacyAlt.totalInterestPaid);
    expect(s.alternativeSaves).toBe(Math.max(0, metrics.result.totalInterestPaid - legacyAlt.totalInterestPaid));
    expect(s.alternativeSaves).toBeGreaterThan(0);
  });

  it('compares avalanche against snowball, never reporting a negative saving', () => {
    const income = makeIncome({ monthlyTakeHome: 3000, essentialExpenses: 2400, payoffMethod: 'avalanche' });
    const metrics = calculatePlanMetrics(DEBTS, income, [])!;
    const s = computeStrategyComparison(DEBTS, income, metrics)!;
    expect(s.alternative).toBe('snowball');
    expect(s.alternativeSaves).toBe(0);
  });

  it('skips custom ordering and empty plans, like PayoffTab', () => {
    const income = makeIncome({ monthlyTakeHome: 3000, essentialExpenses: 2400, payoffMethod: 'custom' });
    expect(computeStrategyComparison(DEBTS, income, calculatePlanMetrics(DEBTS, income, [])!)).toBeNull();
    const paidOff = [makeDebt({ id: 'z', balance: 0, minimumPayment: 0 })];
    const snow = makeIncome({ payoffMethod: 'snowball' });
    expect(computeStrategyComparison(paidOff, snow, calculatePlanMetrics(paidOff, snow, [])!)).toBeNull();
  });
});
