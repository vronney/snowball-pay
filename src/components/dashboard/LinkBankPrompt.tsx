"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PlaidLink } from "@/components/plaid/PlaidLink";
import { track, Events } from "@/lib/analytics";
import { color, radius, easing } from "@/lib/designTokens";

/**
 * Why this exists (2026-09-09): bank linking shipped behind a single quiet
 * outlined button in the header's right cluster, which collapsed to an
 * unlabeled icon circle under 768px. Thirty days of production logs showed
 * zero link-token requests — not a gate rejecting people (there were no 401s
 * or 403s either), just nobody finding it. Paying users with full access were
 * still typing balances in by hand.
 *
 * So the ask moves into the content column, where it sits in the reading path
 * instead of competing with the notification bell and the avatar.
 *
 * Deliberately NOT shown to everyone: only to users who can actually link
 * (Pro or allowlisted), who already have debts worth syncing, and who haven't
 * linked one yet. A prompt for a feature you can't use is worse than none.
 */

const DISMISS_KEY = "sp_link_bank_prompt_dismissed";

/** localStorage throws in private-mode Safari and when site data is blocked. */
function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function persistDismissed(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Dismissal just won't survive a reload. Not worth failing the render.
  }
}

interface LinkBankPromptProps {
  /** Number of manual debts the user is currently updating by hand. */
  manualDebtCount: number;
}

export default function LinkBankPrompt({ manualDebtCount }: LinkBankPromptProps) {
  // Start hidden: reading localStorage during render would mismatch the
  // server-rendered HTML. The effect below decides on the client.
  const [visible, setVisible] = useState(false);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (readDismissed()) return;
    setVisible(true);
    if (!viewTracked.current) {
      viewTracked.current = true;
      track(Events.BANK_LINK_PROMPT_VIEWED, { manual_debt_count: manualDebtCount });
    }
  }, [manualDebtCount]);

  if (!visible) return null;

  const handleDismiss = () => {
    track(Events.BANK_LINK_PROMPT_DISMISSED, { manual_debt_count: manualDebtCount });
    persistDismissed();
    setVisible(false);
  };

  return (
    <section
      aria-labelledby="link-bank-prompt-heading"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        background: color.tint,
        border: `1px solid ${color.tintBorder}`,
        borderRadius: `${radius.card}px`,
        padding: "16px 18px",
        marginBottom: "16px",
        animation: `linkBankPromptIn 250ms ${easing.enter} both`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="eyebrow" style={{ margin: 0 }}>
          Stop updating balances by hand
        </p>
        <h2
          id="link-bank-prompt-heading"
          style={{
            margin: "4px 0 0",
            fontSize: "15px",
            fontWeight: 700,
            color: color.text,
            letterSpacing: "-0.01em",
          }}
        >
          Connect your bank and your balances update themselves
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: color.muted }}>
          {manualDebtCount === 1
            ? "You're tracking 1 debt manually."
            : `You're tracking ${manualDebtCount} debts manually.`}{" "}
          Linking pulls balances straight from your accounts, so logging a payment
          is the last step instead of the first.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <PlaidLink source="prompt" />
        <button
          onClick={handleDismiss}
          aria-label="Dismiss bank linking suggestion"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: color.muted,
            padding: "2px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={14} />
        </button>
      </div>

      <style jsx>{`
        @keyframes linkBankPromptIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          section {
            animation: none !important;
          }
        }
        @media (max-width: 768px) {
          section {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
        }
      `}</style>
    </section>
  );
}
