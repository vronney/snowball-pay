import { describe, expect, it } from 'vitest';
import { computePlanReadiness } from '@/lib/dashboard/readiness';
import { coachMoveCopy } from '@/lib/dashboard/coachMoveCopy';
import type { DashboardInsights, PlanReadiness, PlanSummary, RateWatch } from '@/lib/dashboard/types';
import {
  activeDebtRows, debtsMissingDueDate, freeMoveView, heroView, interestView,
  missedPaymentRows, rateWatchView, readinessCtaLabel, readinessTarget, readinessView,
} from '@/lib/dashboard/thisMonth';
import {
  makeCallAprMove, makeDebt, makeLogMissedMove, makeSwitchMove, makeUnallocatedMove,
} from './fixtures';

const INCOME = { monthlyTakeHome: 4_000, essentialExpenses: 2_000 };

function readinessFor(debts: ReturnType<typeof makeDebt>[], hasAnyPayment = false): PlanReadiness {
  return computePlanReadiness({ debts, income: INCOME, recurringExpenseCount: 0, hasAnyPayment });
}

describe('readinessView', () => {
  it('opens at the real progress and targets the first unfinished step', () => {
    const debts = [
      makeDebt({ id: 'a', balance: 500, minimumPayment: 25 }),
      makeDebt({ id: 'b', balance: 900, minimumPayment: 30, dueDate: 12 }),
      makeDebt({ id: 'c', balance: 300, minimumPayment: 20 }),
    ];
    const view = readinessView(readinessFor(debts));
    expect(view).toEqual({
      title: 'Your plan is 60% set up',
      counter: '3 of 5',
      percent: 60,
      chips: [
        { id: 'debts', label: 'Debts', complete: true },
        { id: 'income', label: 'Income', complete: true },
        { id: 'expenses', label: 'Expenses', complete: true },
        { id: 'dueDates', label: 'Due dates', complete: false },
        { id: 'firstPayment', label: 'First payment', complete: false },
      ],
      cta: { step: 'dueDates', label: 'Add 2 due dates' },
    });
  });

  it('disappears at 5 of 5', () => {
    const debts = [makeDebt({ id: 'a', balance: 500, minimumPayment: 25, dueDate: 3 })];
    expect(readinessView(readinessFor(debts, true))).toBeNull();
  });

  it('hides the debt-dependent steps until a debt exists', () => {
    const view = readinessView(readinessFor([]));
    expect(view?.chips.map((c) => c.id)).toEqual(['debts', 'income', 'expenses']);
    expect(view?.cta).toEqual({ step: 'debts', label: 'Add your debts' });
  });
});

describe('readinessCtaLabel', () => {
  it('names each step, counting due dates', () => {
    expect(readinessCtaLabel({ id: 'debts', complete: false, pendingCount: 1 })).toBe('Add your debts');
    expect(readinessCtaLabel({ id: 'income', complete: false, pendingCount: 1 })).toBe('Add your income');
    expect(readinessCtaLabel({ id: 'expenses', complete: false, pendingCount: 1 })).toBe('Add your expenses');
    expect(readinessCtaLabel({ id: 'dueDates', complete: false, pendingCount: 1 })).toBe('Add 1 due date');
    expect(readinessCtaLabel({ id: 'dueDates', complete: false, pendingCount: 7 })).toBe('Add 7 due dates');
    expect(readinessCtaLabel({ id: 'firstPayment', complete: false, pendingCount: 1 })).toBe('Log your first payment');
  });
});

describe('readinessTarget', () => {
  it("opens the flow for an unfinished step and the step's home once done", () => {
    expect(readinessTarget({ id: 'debts', complete: false, pendingCount: 1 })).toEqual({ kind: 'tab', tab: 'debts' });
    expect(readinessTarget({ id: 'income', complete: true, pendingCount: 0 })).toEqual({ kind: 'tab', tab: 'income' });
    expect(readinessTarget({ id: 'expenses', complete: false, pendingCount: 1 })).toEqual({ kind: 'tab', tab: 'income' });
    expect(readinessTarget({ id: 'dueDates', complete: false, pendingCount: 2 })).toEqual({ kind: 'dueDatesSheet' });
    expect(readinessTarget({ id: 'dueDates', complete: true, pendingCount: 0 })).toEqual({ kind: 'tab', tab: 'debts' });
    expect(readinessTarget({ id: 'firstPayment', complete: false, pendingCount: 1 })).toEqual({ kind: 'firstPaymentSheet' });
    expect(readinessTarget({ id: 'firstPayment', complete: true, pendingCount: 0 })).toEqual({ kind: 'tab', tab: 'debts' });
  });
});

describe('interestView', () => {
  it('floors the estimate and the average, and splits the bar between them', () => {
    const view = interestView({ monthlyEstimate: 840.36, avgMonthlySavedByPlan: 278.3 });
    expect(view).toEqual({
      figure: '$840',
      avgLine: '≈$278/mo your plan saves vs minimums (avg)',
      lenderShare: (840 / (840 + 278)) * 100,
    });
  });

  it('drops the bar and the average when there is no real average', () => {
    expect(interestView({ monthlyEstimate: 50, avgMonthlySavedByPlan: null })).toEqual({ figure: '$50', avgLine: null, lenderShare: null });
    expect(interestView({ monthlyEstimate: 50, avgMonthlySavedByPlan: 0.4 })).toEqual({ figure: '$50', avgLine: null, lenderShare: null });
  });

  it('hides the card under $1 or without a figure', () => {
    expect(interestView(null)).toBeNull();
    expect(interestView({ monthlyEstimate: 0.99, avgMonthlySavedByPlan: 10 })).toBeNull();
    expect(interestView({ monthlyEstimate: Number.NaN, avgMonthlySavedByPlan: 10 })).toBeNull();
  });
});

describe('heroView', () => {
  const plan: PlanSummary = { method: 'snowball', months: 31, debtFreeDate: '2029-04-14', totalInterest: 5_000 };

  it("shows the plan's date, the time to go and v1's paid-off share", () => {
    const debts = [
      makeDebt({ id: 'a', balance: 900, originalBalance: 1_000, minimumPayment: 10 }),
      makeDebt({ id: 'b', balance: 1_000, originalBalance: 1_000, minimumPayment: 10 }),
    ];
    expect(heroView(plan, debts)).toEqual({ dateLabel: 'April 2029', toGo: '2y 7m to go', paidPct: 5 });
  });

  it('reads 0% when no debt records a starting balance', () => {
    expect(heroView(plan, [])?.paidPct).toBe(0);
  });

  it('hides without a plan, at 0 months, or with an unreadable date', () => {
    expect(heroView(null, [])).toBeNull();
    expect(heroView({ ...plan, months: 0 }, [])).toBeNull();
    expect(heroView({ ...plan, debtFreeDate: 'soon' }, [])).toBeNull();
    expect(heroView({ ...plan, months: Number.NaN }, [])).toBeNull();
  });
});

describe('rateWatchView', () => {
  const card = { debtId: 'c1', debtName: 'Citi', apr: 28, targetApr: 19.6, annualEstimate: 742.9 };
  const watch = (cards: number, annualEstimate: number): RateWatch => ({ cards, annualEstimate, top: card, moveTarget: card });

  it('states the floored yearly estimate as an estimate', () => {
    expect(rateWatchView(watch(3, 1656.9))).toEqual({
      eyebrow: 'Rate watch · 3 cards',
      figure: '$1,656/yr',
      caption: 'est. if your cards drop to their target rates',
    });
    expect(rateWatchView(watch(1, 742.9))).toEqual({
      eyebrow: 'Rate watch · 1 card',
      figure: '$742/yr',
      caption: 'est. if this card drops to its target rate',
    });
  });

  it('hides without cards, under $1, or without a finite estimate', () => {
    expect(rateWatchView(null)).toBeNull();
    expect(rateWatchView(watch(2, 0.99))).toBeNull();
    expect(rateWatchView(watch(2, Number.NaN))).toBeNull();
  });
});

describe('freeMoveView', () => {
  const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
  const insights = (coachMoves: DashboardInsights['coachMoves'], tier = FREE) =>
    ({ tier, coachMoves, asOf: { year: 2026, month: 8, day: 14 } });

  it('gives Free users the first move in full and counts the gated rest', () => {
    const move = makeLogMissedMove('Sep', 6);
    const view = freeMoveView(insights([move, makeSwitchMove('avalanche', 1030), makeCallAprMove('c1', 742)]));
    expect(view).toEqual({
      move,
      eyebrow: 'Your free move · Sep',
      priority: 'High',
      copy: coachMoveCopy(move),
      cta: { action: 'bulk_log', label: 'Log them now' },
      moreCount: 2,
    });
  });

  it('picks a CTA per move', () => {
    expect(freeMoveView(insights([makeLogMissedMove('Sep', 1)]))?.cta).toEqual({ action: 'bulk_log', label: 'Log it now' });
    expect(freeMoveView(insights([makeSwitchMove('avalanche', 90, true)]))?.cta).toEqual({ action: 'switch_strategy', label: 'Switch to Avalanche' });
    expect(freeMoveView(insights([makeUnallocatedMove(3, true)]))?.cta).toEqual({ action: 'open_plan', label: 'Open My Plan' });
    expect(freeMoveView(insights([makeCallAprMove('c1', 742, true)]))?.cta).toBeNull();
    expect(freeMoveView(insights([makeSwitchMove('snowball', 90, true)]))?.priority).toBe('Medium');
  });

  it('is null for Pro and trial users, and when the coach found nothing', () => {
    const pro = { ...FREE, proEligible: true };
    expect(freeMoveView(insights([makeLogMissedMove('Sep', 2)], pro))).toBeNull();
    expect(freeMoveView(insights([]))).toBeNull();
    expect(freeMoveView(insights([makeSwitchMove('avalanche', 90, false)]))).toBeNull();
  });
});

describe('sheet rows', () => {
  const debts = [
    makeDebt({ id: 'a', name: 'Visa', balance: 500, minimumPayment: 25 }),
    makeDebt({ id: 'b', name: 'Car', balance: 9_000, minimumPayment: 310, dueDate: 5 }),
    makeDebt({ id: 'paid', name: 'Old card', balance: 0, minimumPayment: 15 }),
  ];

  it('pre-fills missed payments at their minimums, by name', () => {
    const gap = { expected: 2, logged: 0, missed: [{ debtId: 'b', minimumPayment: 310 }, { debtId: 'gone', minimumPayment: 5 }], missedMinimums: 315, notYetDue: 1 };
    expect(missedPaymentRows(gap, debts)).toEqual([{ debtId: 'b', name: 'Car', amount: 310 }]);
    expect(missedPaymentRows(null, debts)).toEqual([]);
  });

  it('lists every active debt for the first payment', () => {
    expect(activeDebtRows(debts)).toEqual([
      { debtId: 'a', name: 'Visa', amount: 25 },
      { debtId: 'b', name: 'Car', amount: 310 },
    ]);
  });

  it('finds exactly the debts readiness counts as missing a due date', () => {
    const missing = debtsMissingDueDate(debts);
    expect(missing.map((d) => d.id)).toEqual(['a']);
    const step = readinessFor(debts).steps.find((s) => s.id === 'dueDates');
    expect(missing).toHaveLength(step?.pendingCount ?? -1);
  });
});
