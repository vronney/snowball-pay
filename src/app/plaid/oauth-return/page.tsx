'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlaidLink } from 'react-plaid-link';
import axios from 'axios';
import {
  PLAID_LINK_TOKEN_KEY,
  PLAID_REAUTH_ITEM_KEY,
} from '@/lib/hooks/usePlaidLink';

/**
 * Plaid OAuth redirect landing page.
 *
 * Registered in the Plaid Dashboard as the "Allowed redirect URI" and passed as
 * `redirect_uri` on link-token creation (via PLAID_REDIRECT_URI). OAuth banks
 * send the browser here after the user authenticates. We resume Plaid Link with
 * the ORIGINAL link token (stashed in localStorage before the redirect) plus
 * `receivedRedirectUri`, let Link complete, exchange the public token, then
 * return to the dashboard.
 */
export default function PlaidOAuthReturnPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Read the stashed link token + current URL (with Plaid's oauth_state_id).
  useEffect(() => {
    setRedirectUri(window.location.href);
    const stored = localStorage.getItem(PLAID_LINK_TOKEN_KEY);
    if (!stored) {
      // Nothing to resume (direct hit / token cleared) — bounce to dashboard.
      localStorage.removeItem(PLAID_REAUTH_ITEM_KEY);
      router.replace('/dashboard');
      return;
    }
    setToken(stored);
  }, [router]);

  function clearStash() {
    localStorage.removeItem(PLAID_LINK_TOKEN_KEY);
    localStorage.removeItem(PLAID_REAUTH_ITEM_KEY);
  }

  const { open, ready } = usePlaidLink({
    token: token ?? '',
    receivedRedirectUri: redirectUri || undefined,
    onSuccess: async (publicToken) => {
      // An update-mode RE-AUTH resume confirms via clear-reauth; a fresh link
      // exchanges the public token. The marker key tells the two apart.
      const reauthItemId = localStorage.getItem(PLAID_REAUTH_ITEM_KEY);
      try {
        if (reauthItemId) {
          await axios.post('/api/plaid/clear-reauth', { plaidItemId: reauthItemId });
        } else {
          await axios.post('/api/plaid/exchange-token', { publicToken });
        }
        clearStash();
        router.replace('/dashboard');
      } catch {
        clearStash();
        setError(
          reauthItemId
            ? "We reconnected your bank but couldn't verify access. Please try again from your dashboard."
            : "We connected your bank but couldn't import your debts. Please try linking again from your dashboard."
        );
      }
    },
    onExit: () => {
      clearStash();
      router.replace('/dashboard');
    },
  });

  // Re-open Link to finish the OAuth handshake as soon as it's ready.
  useEffect(() => {
    if (token && ready) open();
  }, [token, ready, open]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        {error ? (
          <>
            <p className="text-sm leading-relaxed text-slate-600">{error}</p>
            <button
              onClick={() => router.replace('/dashboard')}
              className="inline-flex items-center justify-center rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#1d4ed8] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93c5fd]"
            >
              Back to dashboard
            </button>
          </>
        ) : (
          <>
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#2563eb] border-t-transparent" />
            <p className="text-sm font-medium text-slate-600">
              Finishing your secure connection…
            </p>
          </>
        )}
      </div>
    </main>
  );
}
