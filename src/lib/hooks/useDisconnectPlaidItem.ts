import { useMutation, useQueryClient } from '@tanstack/react-query';

interface DisconnectResponse {
  success: boolean;
}

/**
 * Disconnects a linked institution (PlaidItem): revokes the Plaid token via
 * /item/remove server-side and unlinks the associated debts. Takes the
 * PlaidItem row id (Debt.plaidItemId).
 */
export function useDisconnectPlaidItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plaidItemId: string) => {
      const response = await fetch('/api/plaid/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaidItemId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect account');
      }

      return response.json() as Promise<DisconnectResponse>;
    },
    onSuccess: () => {
      // Debts were unlinked (isLinked=false); refresh the views that show them.
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['accelerationStats'] });
    },
  });
}
