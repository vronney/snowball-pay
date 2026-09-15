import type { Debt, Income } from '@/types';
import { calculatePlanMetrics } from '@/lib/payoffPlan';
import { isActiveDebt, isInPlan } from '@/lib/monthlyFocusDebt';
import { isPayoffComplete } from './payoffCompletion';
import type { Uncounted } from './types';

/**
 * Debts saved outside the plan (spec §5.1). monthsImpact = months with every
 * active debt counted − months of the current plan, both from the
 * calculatePlanMetrics every tab uses. Null if either run is capped at 360
 * months: a capped run's months aren't a date.
 */
export function computeUncounted(
  debts: ReadonlyArray<Debt>,
  income: Income | null,
  expenses: ReadonlyArray<{ amount: number }>,
): Uncounted | null {
  const outside = debts.filter((d) => isActiveDebt(d) && !isInPlan(d));
  if (outside.length === 0) return null;
  return {
    count: outside.length,
    balance: outside.reduce((sum, d) => sum + d.balance, 0),
    monthsImpact: monthsImpact(debts, income, expenses),
  };
}

function monthsImpact(
  debts: ReadonlyArray<Debt>,
  income: Income | null,
  expenses: ReadonlyArray<{ amount: number }>,
): number | null {
  const current = calculatePlanMetrics([...debts], income, [...expenses]);
  const allCounted = calculatePlanMetrics(debts.map((d) => ({ ...d, inPlan: true })), income, [...expenses]);
  if (!current || !allCounted) return null;
  if (!isPayoffComplete(current.result) || !isPayoffComplete(allCounted.result)) return null;
  return allCounted.result.months - current.result.months;
}
