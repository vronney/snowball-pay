import { useMutation, useQueryClient } from '@tanstack/react-query';
import { upgradeEvents } from '@/lib/upgradeEvents';

interface RefreshDebtResponse {
  success: boolean;
  balance: number;
  lastSyncedAt: string;
}

export function useRefreshDebtFromPlaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (debtId: string) => {
      const response = await fetch('/api/plaid/refresh-debt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debtId }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Structured upgrade_required (from upgradeRequired() server-side) —
        // open the global UpgradeModal instead of just showing raw text.
        if (response.status === 403 && error.error === 'upgrade_required') {
          upgradeEvents.dispatch(error.feature ?? 'Bank sync');
        }
        throw new Error(error.error || 'Failed to refresh debt');
      }

      return response.json() as Promise<RefreshDebtResponse>;
    },
    onSuccess: (_data, debtId) => {
      // Mirror useUpdateDebt: a synced balance also changes the snapshot-driven
      // chart, the per-debt view, and acceleration stats — invalidate them all
      // so no view shows stale post-sync numbers.
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['debt', debtId] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['accelerationStats'] });
    },
  });
}
