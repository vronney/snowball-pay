import { useMemo } from 'react';
import { type BalanceSnapshot } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Builds a "Mon YYYY" → summed actual balance map from snapshots.
 * Uses carry-forward: for each month with any snapshot, fills in debts that
 * weren't explicitly logged by carrying their most recent prior snapshot forward.
 */
export function useActualBalanceMap(snapshots: BalanceSnapshot[]): Map<string, number> {
  return useMemo(() => {
    if (snapshots.length === 0) return new Map<string, number>();

    // Group per debt as { ym: "YYYY-MM", balance }[], sorted oldest→newest
    const byDebt = new Map<string, { ym: string; balance: number }[]>();
    for (const s of snapshots) {
      const ym = s.recordedAt.slice(0, 7);
      if (!byDebt.has(s.debtId)) byDebt.set(s.debtId, []);
      byDebt.get(s.debtId)!.push({ ym, balance: s.balance });
    }
    for (const arr of byDebt.values()) arr.sort((a, b) => a.ym.localeCompare(b.ym));

    // All distinct months with any snapshot, sorted chronologically
    const allYMs = [...new Set(snapshots.map((s) => s.recordedAt.slice(0, 7)))].sort();

    const map = new Map<string, number>();
    for (const ym of allYMs) {
      const [year, month] = ym.split('-').map(Number);
      const label = `${MONTHS[month - 1]} ${year}`;
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
      map.set(label, total);
    }
    return map;
  }, [snapshots]);
}
