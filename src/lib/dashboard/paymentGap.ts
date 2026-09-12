import type { Debt } from '@/types';
import { isActiveDebt } from '@/lib/monthlyFocusDebt';
import { isDebtPastDueThisMonth } from '@/lib/debtHelpers';
import type { MissedPayment, PaymentGap } from './types';

export interface PaymentRecordLike {
  debtId: string;
  dueYear: number;
  /** 0-11, as stored on PaymentRecord. */
  dueMonth: number;
}

/**
 * This month's logging state across every active debt. "Missed" reuses the
 * app's single past-due rule (isDebtPastDueThisMonth), so it agrees with the
 * Debts tab. A debt with no due day is never "missed", only not yet logged.
 */
export function computePaymentGap(
  debts: ReadonlyArray<Pick<Debt, 'id' | 'balance' | 'dueDate' | 'minimumPayment'>>,
  records: ReadonlyArray<PaymentRecordLike>,
  today: Date,
): PaymentGap | null {
  const active = debts.filter(isActiveDebt);
  if (active.length === 0) return null;

  const year = today.getFullYear();
  const month = today.getMonth();
  const loggedIds = new Set(
    records.filter((r) => r.dueYear === year && r.dueMonth === month).map((r) => r.debtId),
  );

  let logged = 0;
  let notYetDue = 0;
  const missed: MissedPayment[] = [];
  for (const debt of active) {
    if (loggedIds.has(debt.id)) {
      logged += 1;
    } else if (isDebtPastDueThisMonth(debt, false, today)) {
      missed.push({ debtId: debt.id, minimumPayment: debt.minimumPayment });
    } else {
      notYetDue += 1;
    }
  }
  const missedMinimums = missed.reduce((sum, m) => sum + m.minimumPayment, 0);
  return { expected: active.length, logged, missed, missedMinimums, notYetDue };
}
