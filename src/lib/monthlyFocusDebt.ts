import type { Debt } from '@/types';
import type { DebtPayoffSchedule } from '@/lib/snowball';

const ACTIVE_BALANCE_THRESHOLD = 0.01;

interface FocusPayoffResult {
  payoffSchedule: DebtPayoffSchedule[];
}

export function selectMonthlyFocusDebt(
  debts: Debt[],
  payoffResult: FocusPayoffResult | null | undefined,
  paidDebtIds: ReadonlySet<string> = new Set(),
): Debt | null {
  const activeDebts = debts.filter((debt) => debt.balance > ACTIVE_BALANCE_THRESHOLD);
  if (activeDebts.length === 0) return null;

  const eligibleDebts = activeDebts.filter((debt) => !paidDebtIds.has(debt.id));
  if (eligibleDebts.length === 0) return null;

  const eligibleById = new Map(eligibleDebts.map((debt) => [debt.id, debt]));
  const scheduledFocus = (payoffResult?.payoffSchedule ?? [])
    .filter((step) => eligibleById.has(step.debtId))
    .sort((a, b) => a.orderInPayoff - b.orderInPayoff)[0];

  if (scheduledFocus) return eligibleById.get(scheduledFocus.debtId) ?? null;

  return eligibleDebts[0] ?? null;
}
