'use client';

import React, { useEffect } from 'react';

interface PlaidSuccessProps {
  institutionName: string | null;
  debtsCreated: number;
  showTutorial: boolean;
  tutorialStep: number;
  onTutorialComplete: () => void;
  onNextStep: () => void;
  onDismiss: () => void;
}

/**
 * PlaidSuccess shows:
 * 1. Optional first-time tutorial (2 slides)
 * 2. Success banner with auto-dismiss after 6 seconds
 */
export default function PlaidSuccess({
  institutionName,
  debtsCreated,
  showTutorial,
  tutorialStep,
  onTutorialComplete,
  onNextStep,
  onDismiss,
}: PlaidSuccessProps) {
  useEffect(() => {
    if (!showTutorial) {
      // Auto-dismiss success banner after 6 seconds
      const timer = setTimeout(onDismiss, 6000);
      return () => clearTimeout(timer);
    }
  }, [showTutorial, onDismiss]);

  // Tutorial Step 1
  if (showTutorial && tutorialStep === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div
          className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
          style={{
            animation: 'slideInUp 250ms cubic-bezier(0, 0, 0.2, 1)',
          }}
        >
          <div className="mb-6 text-center">
            <div className="mb-4 text-4xl">📱</div>
            <h2 className="text-lg font-bold text-[#0f172a]">
              Your Bank is Now Connected
            </h2>
          </div>

          <p
            className="mb-6 text-center text-sm text-[#64748b]"
          >
            We imported your balances and interest rates from your bank. Tap the
            sync icon on any linked debt to pull the latest figures anytime.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={onNextStep}
              className="inline-flex items-center justify-center rounded-lg bg-[#2563eb] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93c5fd]"
            >
              Got It
            </button>
            <a
              href="/help/plaid-sync"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-6 py-3 text-sm font-medium text-[#0f172a] transition-all duration-200 hover:bg-[#f1f5f9]"
            >
              Learn More
            </a>
          </div>

          <div className="mt-4 flex justify-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
            <span className="h-2 w-2 rounded-full bg-[#e2e8f0]" />
          </div>
        </div>
      </div>
    );
  }

  // Tutorial Step 2
  if (showTutorial && tutorialStep === 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div
          className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
          style={{
            animation: 'slideInUp 250ms cubic-bezier(0, 0, 0.2, 1)',
          }}
        >
          <div className="mb-6 text-center">
            <div className="mb-4 text-4xl">💚</div>
            <h2 className="text-lg font-bold text-[#0f172a]">
              We Prioritize Your Security
            </h2>
          </div>

          <p
            className="mb-6 text-center text-sm text-[#64748b]"          >
            Your login stays with your bank only. We access read-only debt info
            via Plaid (encrypted, industry-standard).
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={onTutorialComplete}
              className="inline-flex items-center justify-center rounded-lg bg-[#2563eb] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93c5fd]"
            >
              All Set!
            </button>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-6 py-3 text-sm font-medium text-[#0f172a] transition-all duration-200 hover:bg-[#f1f5f9]"
            >
              Read Privacy
            </a>
          </div>

          <div className="mt-4 flex justify-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#e2e8f0]" />
            <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
          </div>
        </div>
      </div>
    );
  }

  // Success Banner (no tutorial)
  return (
    <div
      className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-lg"
      style={{
        animation: 'slideInDown 300ms cubic-bezier(0, 0, 0.2, 1)',
        borderColor: '#10b981',
        backgroundColor: '#f0fdf4',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white text-sm font-bold"
          style={{ backgroundColor: '#10b981' }}
        >
          ✓
        </div>
        <div className="flex-1">
          <h3
            className="text-base font-bold"
            style={{ color: '#10b981' }}
          >
            {institutionName ? `${institutionName} linked successfully` : 'Account linked successfully'}
          </h3>
          <p
            className="mt-1 text-sm"
            style={{ color: '#64748b' }}
          >
            {debtsCreated > 0
              ? `We found ${debtsCreated} ${debtsCreated === 1 ? 'debt' : 'debts'}. They'll appear below in a moment.`
              : 'Your account has been connected.'}
          </p>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="mt-0.5 flex-shrink-0 rounded-lg p-1 text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
