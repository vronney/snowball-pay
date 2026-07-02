import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { PlaidLinkError } from 'react-plaid-link';
import { handleUpgradeError } from '@/lib/hooks';

/**
 * localStorage key holding the active Plaid Link token.
 *
 * OAuth banks (Chase, BofA, …) redirect the whole browser away to the bank and
 * back to /plaid/oauth-return, which destroys React state. The return page
 * resumes Link with this SAME token + `receivedRedirectUri`, so we stash it here
 * before opening Link. No-op effect in sandbox (modal flow never redirects).
 */
export const PLAID_LINK_TOKEN_KEY = 'plaid_link_token';

/**
 * Set alongside PLAID_LINK_TOKEN_KEY when the active flow is an update-mode
 * RE-AUTH for a specific PlaidItem (vs. a fresh link). Lets /plaid/oauth-return
 * resume the right path after an OAuth redirect: clear-reauth, not exchange-token.
 */
export const PLAID_REAUTH_ITEM_KEY = 'plaid_reauth_item_id';

interface PlaidLinkState {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  linkToken: string | null;
}

export interface PlaidLinkResult {
  institutionName: string | null;
  debtsCreated: number;
}

interface CreateLinkTokenResponse {
  linkToken: string;
  expiration: string;
}

export function usePlaidLink() {
  const queryClient = useQueryClient();

  const [state, setState] = useState<PlaidLinkState>({
    isOpen: false,
    isLoading: false,
    error: null,
    success: false,
    linkToken: null,
  });

  const [linkResult, setLinkResult] = useState<PlaidLinkResult | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);

  // Fetch link token on mount/when modal opens
  const createLinkToken = useMutation({
    mutationFn: async (): Promise<CreateLinkTokenResponse> => {
      const { data } = await axios.post(`/api/plaid/create-link-token`);
      return data;
    },
  });

  // Exchange public_token for access_token and fetch liabilities
  const exchangeToken = useMutation({
    mutationFn: async (publicToken: string) => {
      const { data } = await axios.post(`/api/plaid/exchange-token`, {
        publicToken,
      });
      return data;
    },
  });

  const openModal = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await createLinkToken.mutateAsync();
      // Persist so /plaid/oauth-return can resume Link after an OAuth redirect.
      // This is a FRESH link, not a re-auth — clear any stale re-auth marker an
      // abandoned reconnect may have left, or oauth-return would wrongly call
      // clear-reauth instead of exchange-token and never import the new bank.
      localStorage.setItem(PLAID_LINK_TOKEN_KEY, response.linkToken);
      localStorage.removeItem(PLAID_REAUTH_ITEM_KEY);
      setState((prev) => ({
        ...prev,
        isOpen: true,
        linkToken: response.linkToken,
        isLoading: false,
      }));
    } catch (err) {
      // upgrade_required opens the global UpgradeModal instead of an inline
      // error — don't also set a confusing raw error string.
      if (handleUpgradeError(err)) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      const errorMessage =
        axios.isAxiosError<{ error?: string }>(err)
          ? err.response?.data?.error || 'Failed to initialize link'
          : 'Failed to initialize link';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  };

  const closeModal = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleOnSuccess = async (publicToken: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    localStorage.removeItem(PLAID_LINK_TOKEN_KEY);
    try {
      const response = await exchangeToken.mutateAsync(publicToken);

      setLinkResult({
        institutionName: response.institutionName ?? null,
        debtsCreated: response.debtsCreated ?? 0,
      });

      // Invalidate queries so new debts appear immediately
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['accelerationStats'] });

      // Check if first-time (no localStorage flag)
      const hasSeen = localStorage.getItem('plaid_tutorial_seen');
      setShowTutorial(!hasSeen);
      setTutorialStep(1);

      setState((prev) => ({
        ...prev,
        success: true,
        isOpen: false,
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      if (handleUpgradeError(err)) {
        setState((prev) => ({ ...prev, isLoading: false, success: false }));
        return;
      }
      const errorMessage =
        axios.isAxiosError<{ error?: string }>(err)
          ? err.response?.data?.error || 'Failed to link account'
          : 'Failed to link account';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        success: false,
      }));
    }
  };

  // Plaid calls onExit with (error, metadata). A null error is a plain user
  // cancel (no toast); a non-null error is a real failure (institution down,
  // expired session, OAuth denial) the user should see.
  const handleOnExit = (error?: PlaidLinkError | null) => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      error: error
        ? error.display_message ||
          'Your bank connection was interrupted. Please try again.'
        : prev.error,
    }));
    localStorage.removeItem(PLAID_LINK_TOKEN_KEY);
  };

  const completeTutorial = () => {
    localStorage.setItem('plaid_tutorial_seen', 'true');
    setShowTutorial(false);
    setState((prev) => ({ ...prev, success: false })); // Hide success banner after tutorial
  };

  const dismissSuccess = () => {
    setState((prev) => ({ ...prev, success: false }));
  };

  return {
    // State
    isOpen: state.isOpen,
    isLoading: state.isLoading,
    error: state.error,
    showSuccess: state.success,
    linkToken: state.linkToken,
    linkResult,
    showTutorial,
    tutorialStep,

    // Actions
    openModal,
    closeModal,
    handleOnSuccess,
    handleOnExit,
    completeTutorial,
    dismissSuccess,
    nextTutorialStep: () => setTutorialStep((prev) => prev + 1),
  };
}
