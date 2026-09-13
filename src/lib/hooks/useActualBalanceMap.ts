import { useMemo } from 'react';
import { type BalanceSnapshot } from '@/types';

export { computeActualBalanceTotals, type ActualBalanceMonth } from '@/lib/actualBalance';
import { computeActualBalanceTotals } from '@/lib/actualBalance';

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
