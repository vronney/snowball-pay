import { type BalanceSnapshot, type Debt } from '@/types';
import { isInPlan } from '@/lib/monthlyFocusDebt';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface ActualBalanceMonth {
  /** "YYYY-MM" month key */
  ym: string;
  /** "Mon YYYY" label — matches PayoffResult.monthlyBalances[].date */
  label: string;
  /** Summed actual balance across ALL debts (carry-forward filled) */
  total: number;
}

/**
 * Sums actual balances per month from snapshots, with carry-forward: for each
 * month with any snapshot, debts that weren't explicitly logged that month are
 * filled in with their most recent prior snapshot.
 *
 * This is the ONLY correct way to total a month — a raw per-month sum silently
 * drops every debt without a snapshot that month (e.g. only Plaid-linked debts
 * get a snapshot on sync), understating the total by the missing debts.
 */
export function computeActualBalanceTotals(
  snapshots: ReadonlyArray<Pick<BalanceSnapshot, 'debtId' | 'balance' | 'recordedAt'>>,
): ActualBalanceMonth[] {
  if (snapshots.length === 0) return [];

  // Group per debt as { ym: "YYYY-MM", balance }[], sorted oldest→newest.
  // Sorting by ym alone is sufficient: snapshots are unique per (debtId,
  // recordedAt) with recordedAt normalized to the 1st of the month (see
  // prisma BalanceSnapshot), so a debt can never have two same-month rows.
  const byDebt = new Map<string, { ym: string; balance: number }[]>();
  for (const s of snapshots) {
    const ym = s.recordedAt.slice(0, 7);
    if (!byDebt.has(s.debtId)) byDebt.set(s.debtId, []);
    byDebt.get(s.debtId)!.push({ ym, balance: s.balance });
  }
  for (const arr of byDebt.values()) arr.sort((a, b) => a.ym.localeCompare(b.ym));

  // All distinct months with any snapshot, sorted chronologically
  const allYMs = [...new Set(snapshots.map((s) => s.recordedAt.slice(0, 7)))].sort();

  return allYMs.map((ym) => {
    const [year, month] = ym.split('-').map(Number);
    let total = 0;
    for (const arr of byDebt.values()) {
      if (arr[0].ym > ym) continue;
      let bal = arr[0].balance;
      for (const { ym: sym, balance } of arr) {
        if (sym <= ym) bal = balance;
        else break;
      }
      total += bal;
    }
    return { ym, label: `${MONTHS[month - 1]} ${year}`, total };
  });
}

/**
 * Scopes snapshots to the plan's debts, dropping any snapshot whose debt was
 * saved outside the plan (`inPlan === false`). A snapshot whose `debtId`
 * isn't in `debts` at all (e.g. a deleted debt) is kept — only an explicit
 * outside debt is excluded, so historical totals don't silently shrink.
 *
 * The actual-balance total and the projected total must cover the same
 * debts, or the comparison (plan gap, the Plan/Coach balance charts, the
 * Progress variance chart) is apples-to-oranges: the "actual" side would
 * include balances the projection never counted.
 *
 * Returns the SAME array reference when no debt is outside the plan, so
 * existing accounts (every debt in-plan) are untouched byte-for-byte and any
 * `useMemo` keyed on this result sees a stable dependency.
 */
export function planScopedSnapshots<
  S extends Pick<BalanceSnapshot, 'debtId'>,
  D extends Pick<Debt, 'id' | 'inPlan'>,
>(snapshots: ReadonlyArray<S>, debts: ReadonlyArray<D>): ReadonlyArray<S> {
  const outsideIds = new Set(debts.filter((d) => !isInPlan(d)).map((d) => d.id));
  if (outsideIds.size === 0) return snapshots;
  return snapshots.filter((s) => !outsideIds.has(s.debtId));
}

/**
 * Σ balance of the plan's debts (paid-off debts included — their balance is
 * already ~0). The like-for-like counterpart to `planScopedSnapshots`: the
 * fallback "current total" used when comparing against the projection must
 * cover the same debts the projection was built from.
 */
export function planScopedBalanceTotal<D extends Pick<Debt, 'balance' | 'inPlan'>>(
  debts: ReadonlyArray<D>,
): number {
  return debts.filter(isInPlan).reduce((sum, d) => sum + (d.balance ?? 0), 0);
}
