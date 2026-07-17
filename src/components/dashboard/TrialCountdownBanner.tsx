"use client";

import { ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { getErrorMessage, type SubscriptionInfo, useOpenBillingPortal } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { shouldShowLateTrialNotice } from "@/lib/upgradeMessaging";

/** Returns whole days remaining until a future date string, or null if not applicable. */
function daysUntil(dateStr: string): number | null {
  const end = new Date(dateStr).getTime();
  const now = Date.now();
  if (end <= now) return 0;
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

interface TrialCountdownBannerProps {
  sub: SubscriptionInfo | undefined;
  /** True when any debt is Plaid-linked — gates the "bank sync" loss mention. */
  hasLinkedBankDebt?: boolean;
}

export default function TrialCountdownBanner({ sub, hasLinkedBankDebt = false }: TrialCountdownBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const portal = useOpenBillingPortal();

  if (dismissed) return null;
  if (!sub || sub.subscriptionStatus !== "trialing" || !sub.subscriptionEndsAt) return null;

  const days = daysUntil(sub.subscriptionEndsAt);
  if (days === null || !shouldShowLateTrialNotice(days)) return null;

  const urgent = days <= 3;
  const label = days === 0
    ? "Your trial ends today"
    : days === 1
      ? "1 day left in your trial"
      : `${days} days left in your Pro trial`;
  const portalError = portal.isError
    ? getErrorMessage(portal.error, "Could not open billing. Please try again.")
    : null;

  function handleReviewBilling() {
    track(Events.BILLING_PORTAL_OPENED, {
      source: "trial_countdown",
      intent: "review_trial_billing",
    });
    portal.mutate(undefined);
  }

  return (
    <div
      style={{
        background: urgent ? "#fef3c7" : "#eff6ff",
        borderBottom: `1px solid ${urgent ? "rgba(217,119,6,0.2)" : "rgba(37,99,235,0.12)"}`,
        padding: "10px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        fontSize: "13px",
        color: urgent ? "#92400e" : "#1e40af",
      }}
    >
      <div>
        <span style={{ fontWeight: 700 }}>{label}.</span>{" "}
        Stripe will charge the payment method selected at checkout when the trial ends unless you cancel.
        <span style={{ display: "block", marginTop: "2px", fontSize: "12px" }}>
          {hasLinkedBankDebt
            ? "If the trial ends, coach notes, what-if scenarios, and bank sync pause."
            : "If the trial ends, coach notes and what-if scenarios pause."}
        </span>
        {portalError && (
          <span role="alert" style={{ display: "block", marginTop: "4px", color: "#b91c1c" }}>
            {portalError}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <button
          onClick={handleReviewBilling}
          disabled={portal.isPending}
          style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "6px 12px", borderRadius: "8px",
            background: "#2563eb", color: "#fff",
            border: "none", cursor: portal.isPending ? "wait" : "pointer", fontFamily: "inherit",
            fontSize: "12px", fontWeight: 700,
            opacity: portal.isPending ? 0.7 : 1,
          }}
        >
          <ExternalLink size={12} />
          {portal.isPending ? "Opening…" : "Review billing"}
        </button>

        <button
          onClick={() => setDismissed(true)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: urgent ? "#92400e" : "#64748b", padding: "2px",
            display: "flex", alignItems: "center",
          }}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
