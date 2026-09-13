import { describe, it, expect } from 'vitest';
import { calculatePlanMetrics, calculateResultForAcceleration } from '@/lib/payoffPlan';
import { MAX_MONTHS } from '@/lib/snowball';
import { computeCoachMoves, summarizeMoveValues } from '@/lib/dashboard/coachMoves';
import { isPayoffComplete } from '@/lib/dashboard/payoffCompletion';
import type { PaymentGap, RateWatch, StrategyComparison } from '@/lib/dashboard/types';
import { makeDebt, makeIncome } from './fixtures';

const DEBTS = [
  makeDebt({ id: 'a', balance: 1000, minimumPayment: 30, interestRate: 5 }),
  makeDebt({ id: 'b', balance: 3000, minimumPayment: 60, interestRate: 25 }),
];
// Take-home 3000 − essentials 2000 − minimums 90 = 910 available; planned extra is only 100.
const INCOME = makeIncome({ monthlyTakeHome: 3000, essentialExpenses: 2000, accelerationAmount: 100 });
const METRICS = calculatePlanMetrics(DEBTS, INCOME, [])!;
const GAP: PaymentGap = { expected: 9, logged: 3, missed: [{ debtId: 'a', minimumPayment: 30 }], missedMinimums: 30, notYetDue: 5 };
const STRATEGY: StrategyComparison = { current: 'snowball', currentInterest: 900, alternative: 'avalanche', alternativeInterest: 700, alternativeSaves: 200 };
const TOP_CARD = { debtId: 'b', debtName: 'b', apr: 25, targetApr: 17.5, annualEstimate: 300 };
const RATES: RateWatch = { cards: 1, annualEstimate: 300, top: TOP_CARD, moveTarget: TOP_CARD };

const base = { paymentGap: GAP, monthLabel: 'Sep', debts: DEBTS, income: INCOME, metrics: METRICS, strategy: STRATEGY, rateWatch: RATES };

describe('computeCoachMoves (spec §5.1, D2)', () => {
  it('ranks log → unused cash → strategy → APR, and frees only the first move on Free', () => {
    const moves = computeCoachMoves({ ...base, proEligible: false });
    expect(moves.map((m) => [m.id, m.isFree])).toEqual([
      ['log_missed', true],
      ['use_unallocated', false],
      ['switch_strategy', false],
      ['call_apr', false],
    ]);
  });

  it('frees every move for Pro and trial users', () => {
    expect(computeCoachMoves({ ...base, proEligible: true }).every((m) => m.isFree)).toBe(true);
  });

  it('values "unused cash" with the engine, raising acceleration to available cash flow', () => {
    const faster = calculateResultForAcceleration(DEBTS, INCOME, METRICS, METRICS.availableCashFlow);
    const move = computeCoachMoves({ ...base, proEligible: false }).find((m) => m.id === 'use_unallocated');
    expect(move?.value).toEqual({ kind: 'months', amount: METRICS.result.months - faster.months });
    expect(move?.facts).toEqual({
      unusedMonthly: METRICS.availableCashFlow - METRICS.effectiveAcceleration,
      targetAcceleration: METRICS.availableCashFlow,
      monthsSooner: METRICS.result.months - faster.months,
    });
  });

  it('emits no move without a real value (hide, never zero)', () => {
    const allUsed = makeIncome({ monthlyTakeHome: 3000, essentialExpenses: 2000, accelerationAmount: null });
    const moves = computeCoachMoves({
      ...base,
      paymentGap: { ...GAP, missed: [], missedMinimums: 0 },
      income: allUsed,
      metrics: calculatePlanMetrics(DEBTS, allUsed, [])!,
      strategy: { ...STRATEGY, alternativeSaves: 0 },
      rateWatch: null,
      proEligible: false,
    });
    expect(moves).toEqual([]);
  });

  it('skips "unused cash" when the plan is stuck at the 360-month cap', () => {
    const broke = makeIncome({ monthlyTakeHome: 90, essentialExpenses: 0, accelerationAmount: 0 });
    const stuck = [makeDebt({ id: 'x', balance: 50_000, minimumPayment: 90, interestRate: 29 })];
    const metrics = calculatePlanMetrics(stuck, broke, [])!;
    const moves = computeCoachMoves({ ...base, debts: stuck, income: broke, metrics, paymentGap: null, strategy: null, rateWatch: null, proEligible: false });
    expect(moves.find((m) => m.id === 'use_unallocated')).toBeUndefined();
  });

  it('offers "unused cash" for a plan that finishes in exactly month 360 (Codex P2)', () => {
    // $36,000 at 0% paid at the $100 minimum ends in month 360 but does pay off, so it isn't capped.
    const exact = [makeDebt({ id: 'x', balance: 36_000, minimumPayment: 100, interestRate: 0 })];
    // Take-home 3000 − essentials 2890 − minimum 100 = $10/mo left over; no planned extra.
    const income = makeIncome({ monthlyTakeHome: 3000, essentialExpenses: 2890, accelerationAmount: 0 });
    const metrics = calculatePlanMetrics(exact, income, [])!;
    expect(metrics.result.months).toBe(MAX_MONTHS);
    expect(isPayoffComplete(metrics.result)).toBe(true); // finished, not stopped by the cap
    const move = computeCoachMoves({ ...base, debts: exact, income, metrics, paymentGap: null, strategy: null, rateWatch: null, proEligible: false })
      .find((m) => m.id === 'use_unallocated');
    expect(move?.value.amount).toBeGreaterThanOrEqual(1);
  });

  it('calls about the highest-APR card worth ≥ $1 when the top card is nearly paid off (Codex P2)', () => {
    const tiny = { debtId: 't', debtName: 'Tiny', apr: 30, targetApr: 21, annualEstimate: 0.09 };
    const material = { debtId: 'b', debtName: 'b', apr: 25, targetApr: 17.5, annualEstimate: 75 };
    const moves = computeCoachMoves({
      ...base,
      proEligible: true,
      rateWatch: { cards: 2, annualEstimate: 75.09, top: tiny, moveTarget: material },
    });
    expect(moves.find((m) => m.id === 'call_apr')).toMatchObject({ value: { kind: 'perYear', amount: 75 }, facts: material });
  });

  it('omits call_apr when no card is worth ≥ $1', () => {
    const tiny = { debtId: 't', debtName: 'Tiny', apr: 30, targetApr: 21, annualEstimate: 0.09 };
    const moves = computeCoachMoves({
      ...base,
      proEligible: true,
      rateWatch: { cards: 1, annualEstimate: 0.09, top: tiny, moveTarget: null },
    });
    expect(moves.find((m) => m.id === 'call_apr')).toBeUndefined();
  });
});

describe('summarizeMoveValues (deviation X7)', () => {
  it('keeps per-year and one-time savings apart and never adds months', () => {
    const moves = computeCoachMoves({ ...base, proEligible: false });
    const unused = moves.find((m) => m.id === 'use_unallocated')!;
    expect(summarizeMoveValues(moves)).toEqual({
      count: 4,
      perYear: 300,
      oneTime: 200,
      monthsSooner: unused.value.amount,
    });
    expect(summarizeMoveValues([])).toEqual({ count: 0, perYear: 0, oneTime: 0, monthsSooner: 0 });
  });
});
