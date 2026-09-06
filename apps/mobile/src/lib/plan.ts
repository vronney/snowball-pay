import type { PayoffResult } from './types';

/** The engine stops at this many months whether or not the debt is gone. */
export const MAX_PLAN_MONTHS = 360;

/**
 * True when the simulation hit its cap with balance still owed — payments
 * don't cover interest. The cap date must never be shown as a real
 * debt-free date, and per-debt "paid off" months are meaningless.
 */
export function isPlanUnfinished(result: Pick<PayoffResult, 'months' | 'monthlyBalances'>): boolean {
  if (result.months < MAX_PLAN_MONTHS) return false;
  const last = result.monthlyBalances[result.monthlyBalances.length - 1];
  return (last?.totalBalance ?? 0) > 0.01;
}

/**
 * Calendar month `months` from today, on the 1st, in local time. The engine
 * anchors its schedule to "now", so deriving labels from the month count
 * keeps them stable across devices and time zones and avoids setMonth
 * overflow on the 29th–31st.
 */
export function monthFromNow(months: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + months, 1);
}
