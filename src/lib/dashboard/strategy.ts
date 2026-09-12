import type { Debt } from '@/types';
import {
  calculateResultForAcceleration,
  type PayoffIncomeInput,
  type PlanMetrics,
} from '@/lib/payoffPlan';
import type { StrategyComparison } from './types';

/**
 * Snowball vs avalanche on the same debts and acceleration, mirroring the My
 * Plan readout (PayoffTab.tsx:258-270): custom ordering has no counterpart,
 * and an empty plan has nothing to compare.
 */
export function computeStrategyComparison(
  debts: Debt[],
  income: PayoffIncomeInput,
  metrics: PlanMetrics,
  planStartDate?: Date,
): StrategyComparison | null {
  if (metrics.method === 'custom' || metrics.result.months === 0) return null;
  const current = metrics.method;
  const alternative = current === 'avalanche' ? 'snowball' : 'avalanche';
  const alt = calculateResultForAcceleration(
    debts,
    income,
    metrics,
    metrics.effectiveAcceleration,
    alternative,
    planStartDate,
  );
  const currentInterest = metrics.result.totalInterestPaid;
  return {
    current,
    currentInterest,
    alternative,
    alternativeInterest: alt.totalInterestPaid,
    alternativeSaves: Math.max(0, currentInterest - alt.totalInterestPaid),
  };
}
