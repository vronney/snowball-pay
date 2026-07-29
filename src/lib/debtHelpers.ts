import { type Debt, type BalanceSnapshot } from '@/types';
import { isActiveDebt } from '@/lib/monthlyFocusDebt';

/**
 * A debt is bank-linked only while it has both the Plaid link flag and a
 * live PlaidItem reference — disconnecting clears plaidItemId, at which
 * point the debt is manual again and local balance math applies.
 * Structural param so it works for both Prisma rows and client Debt objects.
 */
export function isDebtBankLinked(
  debt: { isLinked?: boolean | null; plaidItemId?: string | null } | null | undefined,
): boolean {
  return Boolean(debt?.isLinked && debt?.plaidItemId);
}

/**
 * True when this month's due day has already passed (the due day itself still
 * counts as on time). Single source of truth for "overdue" — DebtCard's
 * past-due state and getUpcomingPayments' negative daysUntilDue must agree.
 */
export function isDebtOverdueThisMonth(
  dueDate: number | null | undefined,
  today: Date = new Date(),
): boolean {
  return !!dueDate && today.getDate() > dueDate;
}

/**
 * True when an active debt's due day has passed this month with no payment
 * logged yet. Shared by the compact row and the tab's attention logic so they
 * agree with DebtCard's own past-due state.
 */
export function isDebtPastDueThisMonth(
  debt: { balance: number; dueDate?: number | null },
  paidThisMonth: boolean,
): boolean {
  return debt.balance > 0.01 && !paidThisMonth && isDebtOverdueThisMonth(debt.dueDate);
}

export interface UpcomingPayment {
  debt: Debt;
  daysUntilDue: number;
  label: string;
  color: string;
  bg: string;
  border: string;
}

export function getUpcomingPayments(debts: Debt[]): UpcomingPayment[] {
  const today = new Date();
  const todayDay = today.getDate();
  const results: UpcomingPayment[] = [];

  for (const debt of debts) {
    if (!isActiveDebt(debt)) continue;
    if (!debt.dueDate) continue;
    const dueDay = debt.dueDate;

    // Negative = this month's due date already passed. Callers filter out
    // debts whose payment IS logged, so a negative entry surfaces as an
    // "Overdue" indicator until the payment is logged or the month rolls over
    // — it must NOT silently wrap to next month's date, which would show a
    // missed payment as merely "upcoming".
    const daysUntil = dueDay - todayDay;

    if (daysUntil > 7) continue;

    let label: string;
    let color: string;
    let bg: string;
    let border: string;

    if (daysUntil < 0) {
      label = `Overdue by ${Math.abs(daysUntil)}d`;
      color = '#f87171'; bg = 'rgba(239,68,68,0.08)'; border = 'rgba(239,68,68,0.25)';
    } else if (daysUntil === 0) {
      label = 'Due today';
      color = '#fbbf24'; bg = 'rgba(245,158,11,0.08)'; border = 'rgba(245,158,11,0.25)';
    } else if (daysUntil === 1) {
      label = 'Due tomorrow';
      color = '#60a5fa'; bg = 'rgba(59,130,246,0.08)'; border = 'rgba(59,130,246,0.25)';
    } else {
      label = `Due in ${daysUntil}d`;
      color = '#818cf8'; bg = 'rgba(99,102,241,0.07)'; border = 'rgba(99,102,241,0.2)';
    }

    results.push({ debt, daysUntilDue: daysUntil, label, color, bg, border });
  }

  return results.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export function computeStreak(snapshots: BalanceSnapshot[]): number {
  if (!snapshots.length) return 0;
  const months = new Set(snapshots.map((s) => s.recordedAt.slice(0, 7)));
  const today = new Date();
  let streak = 0;
  let y = today.getFullYear();
  let m = today.getMonth() + 1;
  while (true) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (!months.has(key)) break;
    streak++;
    m--;
    if (m === 0) { m = 12; y--; }
    if (streak > 120) break;
  }
  return streak;
}
