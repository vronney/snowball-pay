import { describe, it, expect } from 'vitest';
import type { ChartEntry } from '@/components/payoff/BalanceOverTimeChart';
import type { PayoffResult } from '@/lib/snowball';
import { buildBalanceChartData, computePlanGap, computePlanGapValue } from '@/lib/dashboard/planGap';
import { makeResult } from './fixtures';

// ── Legacy copies (IntelligenceTab L56-86 and usePlannerComputed L56-64, 938a0f45) ──
function legacyChart(planResult: PayoffResult | null, minimumsOnlyResult: PayoffResult | null, actualBalanceMap: Map<string, number>, currentTotalDebt: number): ChartEntry[] {
  if (!planResult) return [];
  const projectedMap = new Map(planResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]));
  const minimumsMap = new Map((minimumsOnlyResult?.monthlyBalances ?? []).map((mb) => [mb.date, mb.totalBalance]));
  const base = (minimumsOnlyResult?.months ?? 0) >= planResult.months ? minimumsOnlyResult!.monthlyBalances : planResult.monthlyBalances;
  const hasSnapshots = actualBalanceMap.size > 0;
  return base.map((mb, index) => ({
    date: mb.date,
    month: mb.month,
    totalBalance: projectedMap.get(mb.date),
    minimumsBalance: minimumsMap.get(mb.date),
    avalancheBalance: undefined,
    actualBalance: index === 0 && hasSnapshots ? (actualBalanceMap.get(mb.date) ?? currentTotalDebt) : actualBalanceMap.get(mb.date),
  }));
}
function legacyGap(balanceChartData: ChartEntry[]): number | null {
  const reversed = [...balanceChartData].reverse();
  const lastActualPoint = reversed.find((p) => p.actualBalance != null);
  if (lastActualPoint?.actualBalance == null || lastActualPoint.totalBalance == null) return null;
  return lastActualPoint.totalBalance - lastActualPoint.actualBalance;
}

const PLAN = makeResult([['Sep 2026', 1000], ['Oct 2026', 900], ['Nov 2026', 800]]);
const MINIMUMS = makeResult([['Sep 2026', 1000], ['Oct 2026', 950], ['Nov 2026', 900], ['Dec 2026', 850]]);
const CASES: Array<[string, PayoffResult | null, PayoffResult | null, Map<string, number>, number]> = [
  ['no plan', null, MINIMUMS, new Map(), 1000],
  ['no snapshots', PLAN, MINIMUMS, new Map(), 1000],
  ['month 0 anchored to current debt', PLAN, MINIMUMS, new Map([['Aug 2026', 1020]]), 950],
  ['behind in Oct', PLAN, MINIMUMS, new Map([['Sep 2026', 1000], ['Oct 2026', 950]]), 950],
  ['ahead in Oct', PLAN, null, new Map([['Sep 2026', 1000], ['Oct 2026', 880]]), 880],
];

describe('plan gap extraction', () => {
  it.each(CASES)('chart and gap equal legacy: %s', (_name, plan, minimums, actual, current) => {
    const chart = buildBalanceChartData(plan, minimums, actual, current);
    expect(chart).toEqual(legacyChart(plan, minimums, actual, current));
    expect(computePlanGapValue(chart)).toBe(legacyGap(chart));
  });

  it('reports the gap with the month it was measured in', () => {
    const behind = buildBalanceChartData(PLAN, MINIMUMS, new Map([['Sep 2026', 1000], ['Oct 2026', 950]]), 950);
    expect(computePlanGap(behind)).toEqual({ amount: -50, asOfMonth: 'Oct 2026' });
  });

  it('is null without snapshots (never "$0 behind")', () => {
    expect(computePlanGap(buildBalanceChartData(PLAN, MINIMUMS, new Map(), 1000))).toBeNull();
  });
});
