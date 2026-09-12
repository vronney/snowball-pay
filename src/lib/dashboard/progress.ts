import type { BalanceSnapshot, Debt } from '@/types';

type BalanceFields = Pick<Debt, 'balance' | 'originalBalance'>;

export interface ThisMonthPaidProgress {
  totalPaid: number;
  totalOriginal: number;
  hasOriginalBalances: boolean;
}

/**
 * The This Month hero gauge's paid-off figure, verbatim from ThisMonthTab
 * (938a0f45, L106-118): principal paid across all debts. Debts without a
 * recorded originalBalance contribute their current balance to the
 * denominator (0% progress) rather than skewing the ratio.
 */
export function computeThisMonthPaidProgress(debts: ReadonlyArray<BalanceFields>): ThisMonthPaidProgress {
  let paid = 0;
  let original = 0;
  let known = false;
  for (const d of debts) {
    const hasOriginal = d.originalBalance > 0;
    if (hasOriginal) known = true;
    const base = hasOriginal ? d.originalBalance : d.balance;
    original += base;
    paid += Math.max(0, base - d.balance);
  }
  return { totalPaid: paid, totalOriginal: original, hasOriginalBalances: known };
}

export interface ProgressTotals {
  currentTotal: number;
  originalTotal: number;
  totalPaid: number;
  paidOffCount: number;
}

/**
 * Progress tab totals, verbatim from ProgressTab (938a0f45, L252-258). Nets
 * growth on one debt against paydown on another, unlike the This Month gauge;
 * the two intentionally stay separate so neither tab's figure changes.
 */
export function computeProgressTotals(debts: ReadonlyArray<BalanceFields>): ProgressTotals {
  const currentTotal = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const originalTotal = debts.reduce((sum, debt) => sum + (debt.originalBalance || debt.balance), 0);
  const totalPaid = Math.max(0, originalTotal - currentTotal);
  const paidOffCount = debts.filter((debt) => debt.balance <= 0).length;
  return { currentTotal, originalTotal, totalPaid, paidOffCount };
}

/**
 * Progress tab streak, verbatim from ProgressTab (938a0f45, L260-276):
 * consecutive calendar months with any balance snapshot, counted back from
 * the latest snapshot month.
 */
export function computeProgressStreak(snapshots: ReadonlyArray<Pick<BalanceSnapshot, 'recordedAt'>>): number {
  const monthKeys = Array.from(new Set(snapshots.map((snapshot) => snapshot.recordedAt.slice(0, 7)))).sort();
  let streak = 0;
  if (monthKeys.length) {
    streak = 1;
    for (let i = monthKeys.length - 1; i > 0; i -= 1) {
      const cur = new Date(`${monthKeys[i]}-01`);
      const prev = new Date(`${monthKeys[i - 1]}-01`);
      const diffMonths = (cur.getFullYear() - prev.getFullYear()) * 12 + cur.getMonth() - prev.getMonth();
      if (diffMonths === 1) streak += 1;
      else break;
    }
  }
  return streak;
}
