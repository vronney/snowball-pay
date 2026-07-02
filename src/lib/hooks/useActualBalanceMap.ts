import { useMemo } from 'react';
import { type BalanceSnapshot } from '@/types';

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
export function computeActualBalanceTotals(snapshots: BalanceSnapshot[]): ActualBalanceMonth[] {
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
 * Builds a "Mon YYYY" → summed actual balance map from snapshots.
 * See computeActualBalanceTotals for the carry-forward semantics.
 */
export function useActualBalanceMap(snapshots: BalanceSnapshot[]): Map<string, number> {
  return useMemo(
    () => new Map(computeActualBalanceTotals(snapshots).map((m) => [m.label, m.total])),
    [snapshots]
  );
}
