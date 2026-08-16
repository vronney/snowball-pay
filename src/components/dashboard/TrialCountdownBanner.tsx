"use client";

import { ExternalLink, X, Zap } from "lucide-react";
import { useState } from "react";
import {
  getErrorMessage,
  type SubscriptionInfo,
  useOpenBillingPortal,
  useStartCheckout,
} from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { shouldShowLateTrialNotice } from "@/lib/upgradeMessaging";
import { isInPostTrialPromptWindow } from "@/lib/billing";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Returns whole days remaining until a future date string (0 when past). */
function daysUntil(dateStr: string): number {
  const end = new Date(dateStr).getTime();
  const now = Date.now();
  if (end <= now) return 0;
  return Math.ceil((end - now) / DAY_MS);
}

interface TrialCountdownBannerProps {
  sub: SubscriptionInfo | undefined;
  /** True when any debt is Plaid-linked — gates the "bank sync" loss mention. */
  hasLinkedBankDebt?: boolean;
}

interface BannerShellProps {
  urgent: boolean;
  label: string;
  detail: string;
  error: string | null;
  cta: React.ReactNode;
  onDismiss: () => void;
}

function BannerShell({ urgent, label, detail, error, cta, onDismiss }: BannerShellProps) {
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
        <span style={{ display: "block", marginTop: "2px", fontSize: "12px" }}>{detail}</span>
        {error && (
          <span role="alert" style={{ display: "block", marginTop: "4px", color: "#b91c1c" }}>
            {error}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {cta}
        <button
          onClick={onDismiss}
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

const ctaButtonStyle = (pending: boolean) => ({
  display: "inline-flex" as const,
  alignItems: "center" as const,
  gap: "5px",
  padding: "6px 12px",
  borderRadius: "8px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  cursor: pending ? ("wait" as const) : ("pointer" as const),
  fontFamily: "inherit",
  fontSize: "12px",
  fontWeight: 700,
  opacity: pending ? 0.7 : 1,
});

export default function TrialCountdownBanner({ sub, hasLinkedBankDebt = false }: TrialCountdownBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const portal = useOpenBillingPortal();
  const checkout = useStartCheckout();

  if (dismissed || !sub) return null;

  // --- Legacy Stripe card trial (pre-signup-window subscribers): keep the
  // billing warning until those trials finish converting or canceling. ---
  if (sub.subscriptionStatus === "trialing" && sub.subscriptionEndsAt) {
    const days = daysUntil(sub.subscriptionEndsAt);
    if (!shouldShowLateTrialNotice(days)) return null;

    const label = days === 0
      ? "Your trial ends today"
      : days === 1
        ? "1 day left in your trial"
        : `${days} days left in your Pro trial`;

    return (
      <BannerShell
        urgent={days <= 3}
        label={label}
        detail={
          "Stripe will charge the payment method selected at checkout when the trial ends unless you cancel. " +
          (hasLinkedBankDebt
            ? "If the trial ends, coach notes, what-if scenarios, and bank sync pause."
            : "If the trial ends, coach notes and what-if scenarios pause.")
        }
        error={portal.isError ? getErrorMessage(portal.error, "Could not open billing. Please try again.") : null}
        onDismiss={() => setDismissed(true)}
        cta={
          <button
            onClick={() => {
              track(Events.BILLING_PORTAL_OPENED, {
                source: "trial_countdown",
                intent: "review_trial_billing",
              });
              portal.mutate(undefined);
            }}
            disabled={portal.isPending}
            style={ctaButtonStyle(portal.isPending)}
          >
            <ExternalLink size={12} />
            {portal.isPending ? "Opening…" : "Review billing"}
          </button>
        }
      />
    );
  }

  // Paid (or canceling-but-still-paid) subscribers never see the free-week
  // messaging.
  if (sub.paidTier === "pro") return null;

  const price = typeof sub.monthlyPrice === "number" ? `$${sub.monthlyPrice}/mo` : null;
  const checkoutError = checkout.isError
    ? getErrorMessage(checkout.error, "Could not start checkout. Please try again.")
    : null;

  const upgradeCta = (label: string, source: string) => (
    <button
      onClick={() => {
        track(Events.CHECKOUT_STARTED, { source, billing: "monthly" });
        checkout.mutate();
      }}
      disabled={checkout.isPending}
      style={ctaButtonStyle(checkout.isPending)}
    >
      <Zap size={12} />
      {checkout.isPending ? "Redirecting…" : label}
    </button>
  );

  // --- Free signup window: countdown through the 7 free days. ---
  if (sub.signupTrialActive && sub.signupTrialEndsAt) {
    const days = daysUntil(sub.signupTrialEndsAt);
    const label = days === 0
      ? "Your free Pro access ends today"
      : days === 1
        ? "1 day left of free Pro access"
        : `${days} days left of free Pro access`;

    return (
      <BannerShell
        urgent={days <= 2}
        label={label}
        detail={
          (hasLinkedBankDebt
            ? "After that, coach notes, what-if scenarios, and bank sync pause. "
            : "After that, coach notes and what-if scenarios pause. ") +
          "Your debts and plan stay."
        }
        error={checkoutError}
        onDismiss={() => setDismissed(true)}
        cta={upgradeCta(price ? `Keep Pro — ${price}` : "Keep Pro", "signup_trial_banner")}
      />
    );
  }

  // --- Free week just ended: prompt to subscribe for a limited window, then
  // stop nagging (feature-level gates keep offering upgrades contextually). ---
  if (sub.signupTrialEndsAt) {
    if (isInPostTrialPromptWindow(sub.signupTrialEndsAt)) {
      return (
        <BannerShell
          urgent
          label="Your free week of Pro has ended"
          detail="Your debts and plan are safe on Free. Upgrade to keep coach notes, what-if scenarios, and unlimited debts."
          error={checkoutError}
          onDismiss={() => setDismissed(true)}
          cta={upgradeCta(price ? `Upgrade — ${price}` : "Upgrade to Pro", "signup_trial_expired_banner")}
        />
      );
    }
  }

  return null;
}
