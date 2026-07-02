'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Landmark } from 'lucide-react';
import { PlaidLinkOptions, usePlaidLink as usePlaidLinkLibrary } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { usePlaidLink } from '@/lib/hooks/usePlaidLink';
import PlaidLinkModal from './PlaidLinkModal';
import PlaidSuccess from './PlaidSuccess';
import PlaidError from './PlaidError';

export function PlaidLink() {
  const {
    isOpen,
    isLoading,
    error,
    showSuccess,
    linkToken,
    linkResult,
    showTutorial,
    tutorialStep,
    openModal,
    closeModal,
    handleOnSuccess,
    handleOnExit,
    completeTutorial,
    dismissSuccess,
    nextTutorialStep,
  } = usePlaidLink();

  // Plaid Link library integration
  const plaidConfig: PlaidLinkOptions = {
    token: linkToken || '',
    onSuccess: (publicToken) => {
      handleOnSuccess(publicToken);
    },
    onExit: handleOnExit,
  };

  const { open: plaidOpen, ready: plaidReady } = usePlaidLinkLibrary(plaidConfig);

  // Express Consent gate — shown before initiating the Plaid flow
  const [showConsent, setShowConsent] = React.useState(false);

  // Open Plaid modal when linkToken is ready
  useEffect(() => {
    if (isOpen && plaidReady && linkToken) {
      plaidOpen();
    }
  }, [isOpen, plaidReady, linkToken, plaidOpen]);

  // Close the consent dialog on Escape
  useEffect(() => {
    if (!showConsent) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowConsent(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showConsent]);

  return (
    <>
      {/* Quiet header affordance — outlined with a bank icon; label on
          desktop, icon-only circle on mobile (see .plaid-link-btn styles in
          DashboardClient). Solid primary blue is reserved for real CTAs like
          the consent dialog's Continue. */}
      <button
        onClick={() => setShowConsent(true)}
        disabled={isLoading}
        aria-label="Link your bank account"
        title="Link Bank Account"
        className="plaid-link-btn group inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
      >
        {isLoading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
        ) : (
          <>
            <Landmark size={16} strokeWidth={2} aria-hidden="true" />
            <span className="plaid-link-label">Link bank</span>
          </>
        )}
      </button>

      {/* Express Consent Dialog — shown before Plaid Link initiates */}
      {/* Rendered via a portal to document.body so the fixed overlay centers
          against the viewport. The dashboard header uses backdrop-filter +
          position:sticky, which would otherwise become the containing block
          for `position: fixed` and pin this dialog to the top of the header. */}
      {showConsent && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowConsent(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="plaid-consent-heading"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h2
              id="plaid-consent-heading"
              className="text-lg font-semibold text-slate-900"
            >
              Connect your account securely
            </h2>

            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                SnowballPay uses{' '}
                <span className="font-medium text-slate-900">Plaid</span> to
                securely read your account{' '}
                <span className="font-medium text-slate-900">balances</span>,{' '}
                <span className="font-medium text-slate-900">
                  interest rates (APR)
                </span>
                , and{' '}
                <span className="font-medium text-slate-900">
                  minimum payments
                </span>{' '}
                for the debts you choose to link. This information is used{' '}
                <span className="font-medium text-slate-900">only</span> to track
                your payoff progress.
              </p>
              <p>
                SnowballPay never sees your bank login credentials — Plaid handles
                that directly. You can disconnect a linked account at any time
                from your dashboard to stop sharing its data.
              </p>
              <p>
                Learn more in{' '}
                <a
                  href="https://plaid.com/legal/#end-user-privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-700"
                >
                  Plaid&rsquo;s end-user privacy policy
                </a>
                .
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowConsent(false)}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-transparent px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConsent(false);
                  openModal();
                }}
                className="inline-flex items-center justify-center rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#1d4ed8] active:shadow-[0_4px_12px_rgba(37,99,235,0.3)] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93c5fd]"
              >
                Continue
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Error Toast (if initial link token fetch fails) */}
      {error && !isOpen && (
        <PlaidError
          title="Couldn't initialize link"
          message={error}
          onDismiss={() => {
            // Error is cleared when modal is opened again
          }}
          actions={[
            {
              label: 'Try Again',
              onClick: openModal,
            },
            {
              label: 'Maybe Later',
              variant: 'secondary',
              onClick: () => {
                // User dismissed
              },
            },
          ]}
        />
      )}

      {/* Success Banner + Optional Tutorial */}
      {showSuccess && (
        <PlaidSuccess
          institutionName={linkResult?.institutionName ?? null}
          debtsCreated={linkResult?.debtsCreated ?? 0}
          showTutorial={showTutorial}
          tutorialStep={tutorialStep}
          onTutorialComplete={completeTutorial}
          onNextStep={nextTutorialStep}
          onDismiss={dismissSuccess}
        />
      )}

      {/* Hidden modal wrapper — Plaid Link opens as a modal via react-plaid-link */}
      {isOpen && (
        <PlaidLinkModal
          isOpen={isOpen}
          isLoading={isLoading}
          onClose={closeModal}
        />
      )}
    </>
  );
}
