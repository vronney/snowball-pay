import type { BalanceSnapshot, Debt, Income } from '@/types';
import { calculateMinimumsOnlyResult, calculatePlanMetrics } from '@/lib/payoffPlan';
import { computeActualBalanceTotals } from '@/lib/actualBalance';
import { computeCoachMoves } from './coachMoves';
import { computeMonthlyInterest } from './interest';
import { computePaymentGap, type PaymentRecordLike } from './paymentGap';
import { buildBalanceChartData, computePlanGap } from './planGap';
import { computeProgressStreak, computeProgressTotals } from './progress';
import { computeRateWatch } from './rateWatch';
import { computePlanReadiness } from './readiness';
import { computeStrategyComparison } from './strategy';
import { computeStreakGrid, snapshotMonthSet } from './streakGrid';
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
  const minimums = debts.length > 0 ? calculateMinimumsOnlyResult(debts, planStartDate) : null;

  const readiness = computePlanReadiness({
    debts,
    income,
    recurringExpenseCount: input.expenses.filter((e) => e.amount > 0).length,
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
    computeActualBalanceTotals(input.snapshots).map((m) => [m.label, m.total]),
  );
  const currentTotalDebt = debts.reduce((s, d) => s + (d.balance ?? 0), 0);
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
    plan: metrics
      ? {
          method: metrics.method,
          months: metrics.result.months,
          debtFreeDate: metrics.result.debtFreeDate.toISOString(),
          totalInterest: metrics.result.totalInterestPaid,
        }
      : null,
  };
}
