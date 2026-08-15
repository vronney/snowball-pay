"use client";

import { useEffect, useRef, useState } from "react";
import { Layers } from "lucide-react";
import { upgradeEvents } from "@/lib/upgradeEvents";
import { Events, track } from "@/lib/analytics";
import { formatMonths } from "@/lib/utils";
import { cardSurface } from "@/lib/designTokens";

/** Free-tier debt cap — mirrors the server gate in /api/debts (PLANS.free). */
const FREE_DEBT_LIMIT = 5;
const DISMISS_KEY = "sp_debt_cap_prompt_dismissed_v1";

interface DebtCapUpsellProps {
  debtCount: number;
  /** Months to debt-free on the current (possibly partial) plan. */
  planMonths: number | null;
  /** Confirmed-Free only — never render while subscription state is loading. */
  isConfirmedFree: boolean;
}

/**
 * Proactive prompt for Free users sitting at the debt cap — the one persona
 * with demonstrated willingness to pay (every subscriber to date carried 10+
 * debts). Truthful loss-framing: we don't know they have more debts, so the
 * copy is conditional ("if there's more...") and the decline option is an
 * honest "that's all my debts", which dismisses permanently on this device.
 */
export default function DebtCapUpsell({
  debtCount,
  planMonths,
  isConfirmedFree,
}: DebtCapUpsellProps) {
  const [dismissed, setDismissed] = useState(true);
  const viewTracked = useRef(false);

  // localStorage is browser-only — resolve the dismissal after mount so the
  // SSR pass and first client render agree (hidden), then reveal if eligible.
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const eligible = isConfirmedFree && debtCount >= FREE_DEBT_LIMIT && !dismissed;

  useEffect(() => {
    if (!eligible || viewTracked.current) return;
    viewTracked.current = true;
    track(Events.DEBT_CAP_PROMPT_VIEWED, { debt_count: debtCount });
  }, [eligible, debtCount]);

  if (!eligible) return null;

  const handleDismiss = () => {
    track(Events.DEBT_CAP_PROMPT_DISMISSED, { debt_count: debtCount });
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Storage unavailable — session-only dismissal still applies via state.
    }
    setDismissed(true);
  };

  return (
    <div style={{ ...cardSurface, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {/* Neutral — the icon is passive; blue stays on the CTA only. */}
          <Layers size={15} style={{ color: "#64748b" }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
            Your plan covers {debtCount} debts — the Free limit
          </p>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: 1.55 }}>
            If that&apos;s everything you owe, you&apos;re all set. If there&apos;s
            more,
            {planMonths !== null && planMonths > 0 ? (
              <>
                {" "}your debt-free-in-
                <strong style={{ color: "#0f172a" }}>{formatMonths(planMonths)}</strong>{" "}
                estimate
              </>
            ) : (
              <> your payoff plan</>
            )}{" "}
            is working from a partial picture — the real date and interest
            numbers include every debt.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "12px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => upgradeEvents.dispatch("Unlimited debts")}
              className="glow-primary"
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 700,
                background: "#2563eb",
                color: "#ffffff",
                fontFamily: "inherit",
              }}
            >
              Add every debt — upgrade to Pro
            </button>
            <button
              onClick={handleDismiss}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
                color: "#94a3b8",
                padding: "8px 0",
                fontFamily: "inherit",
              }}
            >
              That&apos;s all my debts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
