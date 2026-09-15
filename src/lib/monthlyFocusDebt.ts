import type { Debt } from '@/types';
import type { DebtPayoffSchedule } from '@/lib/snowball';

const ACTIVE_BALANCE_THRESHOLD = 0.01;

export function isActiveDebt(debt: Pick<Debt, 'balance'>): boolean {
  return debt.balance > ACTIVE_BALANCE_THRESHOLD;
}

/**
 * Counted by the payoff plan (spec §6.1). Only an explicit `false` is
 * outside: rows from before the column, older payloads and fixtures carry no
 * value and stay in the plan, so no existing number moves.
 */
export function isInPlan(debt: Pick<Debt, 'inPlan'>): boolean {
  return debt.inPlan !== false;
}

/** An active debt the plan counts: what plan math feeds the engine (spec §6.2). */
export function isPlanDebt(debt: Pick<Debt, 'balance' | 'inPlan'>): boolean {
  return isActiveDebt(debt) && isInPlan(debt);
}

interface FocusPayoffResult {
  payoffSchedule: DebtPayoffSchedule[];
}

export function selectMonthlyFocusDebt(
  debts: Debt[],
  payoffResult: FocusPayoffResult | null | undefined,
  paidDebtIds: ReadonlySet<string> = new Set(),
): Debt | null {
  // Only the plan's debts can be its focus: a debt saved outside the plan has
  // no place in the payoff order.
  const planDebts = debts.filter(isPlanDebt);
  if (planDebts.length === 0) return null;

  const eligibleDebts = planDebts.filter((debt) => !paidDebtIds.has(debt.id));
  if (eligibleDebts.length === 0) return null;

  const eligibleById = new Map(eligibleDebts.map((debt) => [debt.id, debt]));
  const scheduledFocus = (payoffResult?.payoffSchedule ?? [])
    .filter((step) => eligibleById.has(step.debtId))
    .sort((a, b) => a.orderInPayoff - b.orderInPayoff)[0];

  if (scheduledFocus) return eligibleById.get(scheduledFocus.debtId) ?? null;

  return eligibleDebts[0] ?? null;
}
