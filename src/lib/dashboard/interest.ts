import type { Debt } from '@/types';
import type { PayoffResult } from '@/lib/snowball';
import { isActiveDebt } from '@/lib/monthlyFocusDebt';
import type { MonthlyInterest } from './types';

/**
 * This month's interest estimate plus the plan's average monthly saving.
 * Both formulas are the ones usePlannerComputed already shows Pro users
 * (monthlyInterestLeak / monthlyInterestAvoided), so the numbers agree
 * across tabs. The estimate covers every active debt, because lenders charge
 * interest whether or not a debt is in the plan.
 */
export function computeMonthlyInterest(
  debts: ReadonlyArray<Pick<Debt, 'balance' | 'interestRate'>>,
  plan: PayoffResult | null,
  minimumsOnly: PayoffResult | null,
): MonthlyInterest | null {
  const monthlyEstimate = debts
    .filter(isActiveDebt)
    .reduce((sum, debt) => sum + ((debt.balance * debt.interestRate) / 100) / 12, 0);
  if (!Number.isFinite(monthlyEstimate) || monthlyEstimate <= 0) return null;

  let avgMonthlySavedByPlan: number | null = null;
  if (plan && minimumsOnly && plan.months > 0) {
    const totalSaved = Math.max(0, minimumsOnly.totalInterestPaid - plan.totalInterestPaid);
    const avg = totalSaved / plan.months;
    avgMonthlySavedByPlan = Number.isFinite(avg) && avg > 0 ? avg : null;
  }
  return { monthlyEstimate, avgMonthlySavedByPlan };
}
