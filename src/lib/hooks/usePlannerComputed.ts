import { useMemo } from 'react';
import { type Debt, type Income } from '@/types';
import { type PayoffMethod, type PayoffResult } from '@/lib/snowball';
import { type ChartEntry } from '@/components/payoff/BalanceOverTimeChart';

export interface SmartCalendarItem {
  debt: Debt;
  nextDue: Date;
  daysUntil: number;
}

export interface SmartCalendar {
  items: SmartCalendarItem[];
  dueIn7: number;
  dueIn14: number;
}

export interface RefinanceCandidate {
  debt: Debt;
  estimatedSavings: number;
}

export interface MilestoneData {
  pctPaid: number;
  streak: number;
}

export interface PlannerComputed {
  planGap: number | null;
  confidencePct: number;
  confidenceRangeMonths: number;
  smartCalendar: SmartCalendar;
  monthlyInterestLeak: number;
  monthlyInterestAvoided: number;
  priorityQueue: Debt[];
  leftoverAfterAcceleration: number;
  bufferTarget: number;
  milestoneData: MilestoneData;
  refinanceCandidates: RefinanceCandidate[];
}

export function usePlannerComputed(
  debts: Debt[],
  income: Income,
  payoffMethod: PayoffMethod,
  planResult: PayoffResult,
  minimumsOnlyResult: PayoffResult,
  availableCashFlow: number,
  effectiveAcceleration: number,
  balanceChartData: ChartEntry[],
  hasRealSnapshots: boolean,
): PlannerComputed {
  const today = useMemo(() => new Date(), []);

  const lastActualPoint = useMemo(() => {
    const reversed = [...balanceChartData].reverse();
    return reversed.find((p) => p.actualBalance != null);
  }, [balanceChartData]);

  const planGap = useMemo(() => {
    if (lastActualPoint?.actualBalance == null || lastActualPoint.totalBalance == null) return null;
    return lastActualPoint.totalBalance - lastActualPoint.actualBalance;
  }, [lastActualPoint]);

  const confidencePct = useMemo(() => {
    if (!hasRealSnapshots || planGap == null) return 60;
    const score = 65 + (planGap > 0 ? 18 : planGap < 0 ? -16 : 8);
    return Math.max(45, Math.min(95, score));
  }, [hasRealSnapshots, planGap]);

  const confidenceRangeMonths = Math.max(1, Math.round((100 - confidencePct) / 10));

  const smartCalendar = useMemo<SmartCalendar>(() => {
    const items = debts
      .filter((debt) => debt.dueDate != null)
      .map((debt) => {
        const day = debt.dueDate as number;
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), day);
        const nextDue = thisMonth >= today ? thisMonth : new Date(today.getFullYear(), today.getMonth() + 1, day);
        const ms = nextDue.getTime() - today.getTime();
        const daysUntil = Math.ceil(ms / (1000 * 60 * 60 * 24));
        return { debt, nextDue, daysUntil };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return { items, dueIn7: items.filter((i) => i.daysUntil <= 7).length, dueIn14: items.filter((i) => i.daysUntil <= 14).length };
  }, [debts, today]);

  const monthlyInterestLeak = useMemo(
    () => debts.reduce((sum, debt) => sum + ((debt.balance * debt.interestRate) / 100) / 12, 0),
    [debts],
  );

  const monthlyInterestAvoided = useMemo(() => {
    const totalSaved = Math.max(0, minimumsOnlyResult.totalInterestPaid - planResult.totalInterestPaid);
    return planResult.months > 0 ? totalSaved / planResult.months : 0;
  }, [minimumsOnlyResult.totalInterestPaid, planResult.totalInterestPaid, planResult.months]);

  const priorityQueue = useMemo(() => {
    const sorted = [...debts];
    if (payoffMethod === 'avalanche') sorted.sort((a, b) => b.interestRate - a.interestRate);
    else if (payoffMethod === 'custom') sorted.sort((a, b) => (a.priorityOrder ?? Number.MAX_SAFE_INTEGER) - (b.priorityOrder ?? Number.MAX_SAFE_INTEGER));
    else sorted.sort((a, b) => a.balance - b.balance);
    return sorted.slice(0, 3);
  }, [debts, payoffMethod]);

  const leftoverAfterAcceleration = Math.max(0, availableCashFlow - effectiveAcceleration);
  const bufferTarget = income.monthlyTakeHome * 0.1;

  const milestoneData = useMemo<MilestoneData>(() => {
    const totalOriginal = debts.reduce((sum, d) => sum + Math.max(d.originalBalance || d.balance, d.balance), 0);
    const totalCurrent  = debts.reduce((sum, d) => sum + d.balance, 0);
    const pctPaid = totalOriginal > 0 ? ((totalOriginal - totalCurrent) / totalOriginal) * 100 : 0;
    let streak = 0;
    const actualSeries = balanceChartData.filter((p) => p.actualBalance != null).map((p) => p.actualBalance as number);
    for (let i = actualSeries.length - 1; i > 0; i -= 1) {
      if (actualSeries[i] <= actualSeries[i - 1]) streak += 1;
      else break;
    }
    return { pctPaid, streak };
  }, [debts, balanceChartData]);

  const refinanceCandidates = useMemo<RefinanceCandidate[]>(
    () =>
      debts
        .filter((d) => d.interestRate >= 10 && d.balance >= 3000)
        .sort((a, b) => b.interestRate - a.interestRate)
        .slice(0, 3)
        .map((debt) => ({ debt, estimatedSavings: Math.max(0, debt.balance * ((debt.interestRate - 7.5) / 100) * 0.35) })),
    [debts],
  );

  return {
    planGap,
    confidencePct,
    confidenceRangeMonths,
    smartCalendar,
    monthlyInterestLeak,
    monthlyInterestAvoided,
    priorityQueue,
    leftoverAfterAcceleration,
    bufferTarget,
    milestoneData,
    refinanceCandidates,
  };
}
