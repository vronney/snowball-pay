'use client';

import { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  PLAID_LINK_TOKEN_KEY,
  PLAID_REAUTH_ITEM_KEY,
} from '@/lib/hooks/usePlaidLink';
import { handleUpgradeError } from '@/lib/hooks';

function clearReauthStash() {
  localStorage.removeItem(PLAID_LINK_TOKEN_KEY);
  localStorage.removeItem(PLAID_REAUTH_ITEM_KEY);
}

/**
 * Inline "reconnect your bank" prompt shown on a linked debt whose login has
 * expired (`needsReauth`). Opens Plaid Link in UPDATE MODE for the item so the
 * user re-authenticates the existing connection — preserving the debt and its
 * history — then confirms + clears the flag server-side.
 */
export function PlaidReauthBanner({ plaidItemId }: { plaidItemId: string }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { open, ready } = usePlaidLink({
    token: token ?? '',
    onSuccess: async () => {
      // Modal (non-OAuth) path: Link completes in-page. For OAuth banks the
      // browser redirects to /plaid/oauth-return, which finishes via the stash
      // below instead — so clear it here to avoid a stale resume.
      clearReauthStash();
      try {
        await axios.post('/api/plaid/clear-reauth', { plaidItemId });
        queryClient.invalidateQueries({ queryKey: ['debts'] });
      } catch {
        setError('Reconnected, but we couldn’t verify access. Try again.');
      } finally {
        setToken(null);
      }
    },
    onExit: () => {
      clearReauthStash();
      setToken(null);
    },
  });

  // Auto-open Link once the update-mode token is ready.
  useEffect(() => {
    if (token && ready) open();
  }, [token, ready, open]);

  const startReconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post('/api/plaid/update-link-token', {
        plaidItemId,
      });
      // Stash before opening: OAuth banks redirect the whole browser away to the
      // bank and back to /plaid/oauth-return, which resumes from these keys.
      localStorage.setItem(PLAID_LINK_TOKEN_KEY, data.linkToken);
      localStorage.setItem(PLAID_REAUTH_ITEM_KEY, plaidItemId);
      setToken(data.linkToken);
    } catch (err) {
      if (!handleUpgradeError(err)) {
        setError('Couldn’t start reconnect. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="alert"
      className="mt-2 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-[0.72rem] leading-snug text-amber-800">
        Your bank disconnected. Reconnect to keep this balance syncing.
      </p>
      <button
        onClick={startReconnect}
        disabled={loading}
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#2563eb] px-3 py-1.5 text-[0.72rem] font-medium text-white transition-all duration-200 hover:bg-[#1d4ed8] disabled:opacity-50 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93c5fd]"
      >
        {loading ? 'Starting…' : 'Reconnect'}
      </button>
      {error && (
        <p className="text-[0.7rem] text-red-600 sm:w-full sm:text-right">
          {error}
        </p>
      )}
    </div>
  );
}
