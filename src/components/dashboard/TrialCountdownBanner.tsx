"use client";

import { X, Zap } from "lucide-react";
import { useState } from "react";
import { type SubscriptionInfo } from "@/lib/hooks";
import { upgradeEvents } from "@/lib/upgradeEvents";
import { PRO_TRIAL_DAYS } from "@/lib/billing";

/** Returns whole days remaining until a future date string, or null if not applicable. */
function daysUntil(dateStr: string): number | null {
  const end = new Date(dateStr).getTime();
  const now = Date.now();
  if (end <= now) return 0;
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

interface TrialCountdownBannerProps {
  sub: SubscriptionInfo | undefined;
}

export default function TrialCountdownBanner({ sub }: TrialCountdownBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!sub || sub.subscriptionStatus !== "trialing" || !sub.subscriptionEndsAt) return null;

  const days = daysUntil(sub.subscriptionEndsAt);
  if (days === null) return null;

  const urgent = days <= 3;
  const label = days === 0
    ? "Your trial ends today"
    : days === 1
      ? "1 day left in your trial"
      : `${days} days left in your ${PRO_TRIAL_DAYS}-day trial`;

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
      <span style={{ fontWeight: 600 }}>{label}</span>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <button
          onClick={() => upgradeEvents.dispatch("trial_countdown")}
          style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "5px 12px", borderRadius: "7px",
            background: "#2563eb", color: "#fff",
            border: "none", cursor: "pointer", fontFamily: "inherit",
            fontSize: "12px", fontWeight: 700,
          }}
        >
          <Zap size={12} />
          Keep Pro
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
