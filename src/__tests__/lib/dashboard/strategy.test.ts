import { describe, it, expect } from 'vitest';
import { calculatePlanMetrics, calculateResultForAcceleration } from '@/lib/payoffPlan';
import { MAX_MONTHS } from '@/lib/snowball';
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

  it('skips comparisons when either projection cannot pay off within the cap', () => {
    const debts = [makeDebt({ id: 'x', balance: 1000, minimumPayment: 0, interestRate: 20 })];
    const income = makeIncome({ monthlyTakeHome: 0, essentialExpenses: 0, payoffMethod: 'snowball' });
    const metrics = calculatePlanMetrics(debts, income, [])!;

    expect(metrics.result.months).toBe(MAX_MONTHS);
    expect(computeStrategyComparison(debts, income, metrics)).toBeNull();
  });

  it('skips the comparison when only one method caps, in either direction', () => {
    // Snowball pays the $20k 0% loan first while the $40k 30% card (minimum below its monthly
    // interest) grows past what the payment covers, so snowball caps; avalanche attacks the card
    // first and finishes. Comparing a truncated 30-year total with a completed one would
    // overstate the saving, so both directions must return null.
    const debts = [
      makeDebt({ id: 'loan', balance: 20_000, minimumPayment: 100, interestRate: 0 }),
      makeDebt({ id: 'card', balance: 40_000, minimumPayment: 900, interestRate: 30 }),
    ];
    for (const [current, alternative] of [['snowball', 'avalanche'], ['avalanche', 'snowball']] as const) {
      const income = makeIncome({ monthlyTakeHome: 5000, essentialExpenses: 2000, accelerationAmount: 150, payoffMethod: current });
      const metrics = calculatePlanMetrics(debts, income, [])!;
      const alt = calculateResultForAcceleration(debts, income, metrics, metrics.effectiveAcceleration, alternative);
      const snowballMonths = current === 'snowball' ? metrics.result.months : alt.months;
      const avalancheMonths = current === 'avalanche' ? metrics.result.months : alt.months;
      expect(snowballMonths).toBe(MAX_MONTHS); // fixture really is one-sided
      expect(avalancheMonths).toBeLessThan(MAX_MONTHS);
      expect(computeStrategyComparison(debts, income, metrics)).toBeNull();
    }
  });
});
