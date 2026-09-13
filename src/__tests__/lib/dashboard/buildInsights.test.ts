import { describe, it, expect } from 'vitest';
import { calculatePlanMetrics } from '@/lib/payoffPlan';
import { buildDashboardInsights, type InsightsInput } from '@/lib/dashboard/buildInsights';
import { computeProgressStreak, computeProgressTotals } from '@/lib/dashboard/progress';
import { localDateParam } from '@/lib/dashboard/today';
import { makeDebt, makeIncome, makeSnapshot } from './fixtures';

const TODAY = new Date(2026, 8, 12);
const DEBTS = [
  makeDebt({ id: 'a', balance: 800, originalBalance: 1000, minimumPayment: 30, interestRate: 5, dueDate: 5 }),
  makeDebt({ id: 'b', balance: 3000, minimumPayment: 60, interestRate: 25, dueDate: 10 }),
  makeDebt({ id: 'c', balance: 2000, minimumPayment: 40, interestRate: 18 }),
];
const INCOME = makeIncome({ monthlyTakeHome: 3000, essentialExpenses: 2000, accelerationAmount: 100 });
const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };

function input(overrides: Partial<InsightsInput> = {}): InsightsInput {
  return {
    debts: DEBTS,
    income: INCOME,
    expenses: [{ amount: 50 }],
    monthRecords: [{ debtId: 'a', dueYear: 2026, dueMonth: 8 }],
    hasAnyPayment: true,
    snapshots: [makeSnapshot('a', '2026-08', 900), makeSnapshot('a', '2026-09', 800)],
    tier: FREE,
    today: TODAY,
    ...overrides,
  };
}

describe('buildDashboardInsights', () => {
  it('keeps plan numbers identical to calculatePlanMetrics (planStartDate only moves labels)', () => {
    const plain = calculatePlanMetrics(DEBTS, INCOME, [{ amount: 50 }])!;
    const out = buildDashboardInsights(input());
    expect(out.plan).toEqual({
      method: 'snowball',
      months: plain.result.months,
      debtFreeDate: localDateParam(new Date(2026, 8 + plain.result.months, 12)),
      totalInterest: plain.result.totalInterestPaid,
    });
  });

  it('anchors debtFreeDate on the client day, not UTC midnight (Codex P1)', () => {
    // Pinned to a zone ahead of UTC: there, local midnight on Sep 1 is still
    // Aug 31 in UTC, so a toISOString()-based date would read a day early. In
    // UTC or US zones that regression would pass unnoticed (CodeRabbit).
    const originalTz = process.env.TZ;
    process.env.TZ = 'Asia/Tokyo';
    try {
      expect(new Date(2026, 8, 1).getTimezoneOffset()).toBe(-540); // the pin took effect
      const today = new Date(2026, 8, 1);
      const out = buildDashboardInsights(input({ today }));
      const plain = calculatePlanMetrics(DEBTS, INCOME, [{ amount: 50 }], { planStartDate: new Date(2026, 8, 1) })!;
      expect(out.plan?.debtFreeDate).toBe(localDateParam(new Date(2026, 8 + plain.result.months, 1)));
      expect(out.plan?.debtFreeDate.endsWith('-01')).toBe(true);
    } finally {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    }
  });

  it('assembles every figure', () => {
    const out = buildDashboardInsights(input());
    expect(out.asOf).toEqual({ year: 2026, month: 8, day: 12 });
    expect(out.tier).toEqual(FREE);
    expect(out.readiness.completeCount).toBe(4); // debts, income, expenses, first payment; c has no due day
    expect(out.paymentGap).toMatchObject({ expected: 3, logged: 1, missed: [{ debtId: 'b', minimumPayment: 60 }] });
    expect(out.interest?.monthlyEstimate).toBeGreaterThan(0);
    expect(out.rateWatch?.top.debtId).toBe('b');
    expect(out.strategy?.alternative).toBe('avalanche');
    expect(out.coachMoves[0].id).toBe('log_missed');
    expect(out.coachMoves[0].isFree).toBe(true);
    expect(out.coachMoves.slice(1).every((m) => !m.isFree)).toBe(true);
    expect(out.progress).toMatchObject({
      paidToDate: computeProgressTotals(DEBTS).totalPaid,
      startingTotal: computeProgressTotals(DEBTS).originalTotal,
      streak: computeProgressStreak(input().snapshots),
    });
    expect(out.progress?.grid).toHaveLength(12);
    expect(out.planGap?.asOfMonth).toBe('Sep 2026');
  });

  it('hides plan-derived figures without income, and progress without debts', () => {
    const noIncome = buildDashboardInsights(input({ income: null }));
    expect(noIncome.plan).toBeNull();
    expect(noIncome.strategy).toBeNull();
    expect(noIncome.planGap).toBeNull();
    const empty = buildDashboardInsights(input({ debts: [], snapshots: [], monthRecords: [] }));
    expect(empty.progress).toBeNull();
    expect(empty.paymentGap).toBeNull();
    expect(empty.interest).toBeNull();
    expect(empty.coachMoves).toEqual([]);
  });

  it('frees every move for Pro', () => {
    const pro = buildDashboardInsights(input({ tier: { ...FREE, proEligible: true, paidPro: true } }));
    expect(pro.coachMoves.every((m) => m.isFree)).toBe(true);
  });
});
