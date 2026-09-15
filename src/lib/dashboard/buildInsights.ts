import type { BalanceSnapshot, Debt, Income } from '@/types';
import { calculateMinimumsOnlyResult, calculatePlanMetrics } from '@/lib/payoffPlan';
import { computeActualBalanceTotals, planScopedBalanceTotal, planScopedSnapshots } from '@/lib/actualBalance';
import { computeCoachMoves } from './coachMoves';
import { computeMonthlyInterest } from './interest';
import { computePaymentGap, type PaymentRecordLike } from './paymentGap';
import { buildBalanceChartData, computePlanGap } from './planGap';
import { computeProgressStreak, computeProgressTotals } from './progress';
import { computeRateWatch } from './rateWatch';
import { computePlanReadiness } from './readiness';
import { computeStrategyComparison } from './strategy';
import { computeStreakGrid, snapshotMonthSet } from './streakGrid';
import { localDateParam } from './today';
import { isPayoffComplete } from './payoffCompletion';
import { computeUncounted } from './uncounted';
import type { DashboardInsights, ProgressSummary, TierInfo } from './types';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface InsightsInput {
  debts: Debt[];
  income: Income | null;
  expenses: ReadonlyArray<{ amount: number }>;
  /** Records for today's year/month only. */
  monthRecords: ReadonlyArray<PaymentRecordLike>;
  hasAnyPayment: boolean;
  snapshots: ReadonlyArray<Pick<BalanceSnapshot, 'debtId' | 'balance' | 'recordedAt'>>;
  tier: TierInfo;
  /** The client's local date (validated by the route). */
  today: Date;
}

/**
 * Every dashboard figure from one set of inputs. Pure: no I/O, so the route,
 * tests and (later) Expo all get identical numbers. planStartDate = today
 * only aligns the engine's month labels with the client; months and interest
 * don't depend on it.
 */
export function buildDashboardInsights(input: InsightsInput): DashboardInsights {
  const { debts, income, today, tier } = input;
  const planStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const expenses = input.expenses.map((e) => ({ amount: e.amount }));

  const metrics = calculatePlanMetrics(debts, income, expenses, { planStartDate });
  const completedPlan = metrics && isPayoffComplete(metrics.result) ? metrics : null;
  const minimums = debts.length > 0 ? calculateMinimumsOnlyResult(debts, planStartDate) : null;

  const readiness = computePlanReadiness({
    debts,
    income,
    // Any saved recurring expense counts, $0 included (spec §5.1; matches the
    // Income tab, which only shows its empty state when there are none).
    recurringExpenseCount: input.expenses.length,
    hasAnyPayment: input.hasAnyPayment,
  });
  const interest = computeMonthlyInterest(debts, metrics?.result ?? null, minimums);
  const paymentGap = computePaymentGap(debts, input.monthRecords, today);
  const strategy = metrics && income ? computeStrategyComparison(debts, income, metrics, planStartDate) : null;
  const rateWatch = computeRateWatch(debts);
  const coachMoves = computeCoachMoves({
    paymentGap,
    monthLabel: MONTH_SHORT[today.getMonth()],
    debts,
    income,
    metrics,
    strategy,
    rateWatch,
    proEligible: tier.proEligible,
    planStartDate,
  });

  const actualBalanceMap: ReadonlyMap<string, number> = new Map(
    computeActualBalanceTotals(planScopedSnapshots(input.snapshots, debts)).map((m) => [m.label, m.total]),
  );
  const currentTotalDebt = planScopedBalanceTotal(debts);
  const planGap = metrics
    ? computePlanGap(buildBalanceChartData(metrics.result, minimums, actualBalanceMap, currentTotalDebt))
    : null;

  let progress: ProgressSummary | null = null;
  if (debts.length > 0) {
    const totals = computeProgressTotals(debts);
    progress = {
      paidToDate: totals.totalPaid,
      startingTotal: totals.originalTotal,
      streak: computeProgressStreak(input.snapshots),
      grid: computeStreakGrid(snapshotMonthSet(input.snapshots), paymentGap, today),
    };
  }

  return {
    asOf: { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() },
    tier,
    readiness,
    interest,
    paymentGap,
    coachMoves,
    rateWatch,
    strategy,
    planGap,
    progress,
    plan: completedPlan
      ? {
          method: completedPlan.method,
          months: completedPlan.result.months,
          // Mirror the engine (snowball.ts ~200-201), anchored on the
          // client's day instead of the server clock's `new Date()`, and
          // rendered as a client-local calendar date — `toISOString()` would
          // report UTC midnight, which reads as the previous day/month in US
          // time zones.
          debtFreeDate: (() => {
            const free = new Date(planStartDate);
            free.setMonth(free.getMonth() + completedPlan.result.months);
            return localDateParam(free);
          })(),
          totalInterest: completedPlan.result.totalInterestPaid,
        }
      : null,
    uncounted: computeUncounted(debts, income, expenses),
  };
}
