import type { ChartEntry } from '@/components/payoff/BalanceOverTimeChart';
import type { PayoffResult } from '@/lib/snowball';
import type { PlanGap } from './types';

/**
 * Balance-over-time chart rows, verbatim from IntelligenceTab (938a0f45,
 * L56-86). Month labels ("Sep 2026") come from the engine and must match the
 * snapshot labels from computeActualBalanceTotals.
 */
export function buildBalanceChartData(
  planResult: PayoffResult | null,
  minimumsOnlyResult: PayoffResult | null,
  actualBalanceMap: ReadonlyMap<string, number>,
  currentTotalDebt: number,
): ChartEntry[] {
  if (!planResult) return [];
  const projectedMap = new Map(planResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]));
  const minimumsMap = new Map(
    (minimumsOnlyResult?.monthlyBalances ?? []).map((mb) => [mb.date, mb.totalBalance]),
  );
  const base =
    (minimumsOnlyResult?.months ?? 0) >= planResult.months
      ? minimumsOnlyResult!.monthlyBalances
      : planResult.monthlyBalances;
  const hasSnapshots = actualBalanceMap.size > 0;
  return base.map((mb, index) => ({
    date: mb.date,
    month: mb.month,
    totalBalance: projectedMap.get(mb.date),
    minimumsBalance: minimumsMap.get(mb.date),
    avalancheBalance: undefined,
    // Month 0 anchored to current total debt when snapshots exist; otherwise
    // leave undefined so the gap stays null (no "$NaN behind" display).
    actualBalance:
      index === 0 && hasSnapshots
        ? (actualBalanceMap.get(mb.date) ?? currentTotalDebt)
        : actualBalanceMap.get(mb.date),
  }));
}

function lastActualPoint(chart: ChartEntry[]): ChartEntry | undefined {
  return [...chart].reverse().find((p) => p.actualBalance != null);
}

/** Verbatim from usePlannerComputed (938a0f45, L56-64). Positive = ahead of plan. */
export function computePlanGapValue(chart: ChartEntry[]): number | null {
  const point = lastActualPoint(chart);
  if (point?.actualBalance == null || point.totalBalance == null) return null;
  return point.totalBalance - point.actualBalance;
}

/** The gap plus the month it was measured in. Null when it can't be computed. */
export function computePlanGap(chart: ChartEntry[]): PlanGap | null {
  const amount = computePlanGapValue(chart);
  const point = lastActualPoint(chart);
  if (amount == null || !Number.isFinite(amount) || !point) return null;
  return { amount, asOfMonth: point.date };
}
