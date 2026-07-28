"use client";

import { useMemo } from "react";
import { Lock, Zap, TrendingDown } from "lucide-react";
import { type Debt } from "@/types";
import { isActiveDebt } from "@/lib/monthlyFocusDebt";
import { useAprNegotiation } from "@/lib/apr-negotiation/useAprNegotiation";
import { upgradeEvents } from "@/lib/upgradeEvents";
import { PLANS } from "@/lib/stripe";
import { PRO_TRIAL_DAYS } from "@/lib/billing";
import { formatCurrencyWhole } from "@/lib/utils";

interface IntelligenceUpgradeTeaserProps {
  debts: Debt[];
  /** Projected interest avoided vs minimums-only — the same real figure Pro shows. */
  interestReclaimed: number;
}

// Routed through getUpgradeMessage() substring matching — "Intelligence" maps
// to the intelligence upgrade copy.
const FEATURE = "Intelligence";

/**
 * The Free-tier view of the Intelligence tab. Reciprocity, not a wall: it shows
 * the user's REAL numbers (all computed client-side from their own debts/plan —
 * never fabricated or blurred) and gates only the depth (scripts, Strategy Lab,
 * coach). Rendered only for resolved-Free users; Pro users never see it.
 */
export default function IntelligenceUpgradeTeaser({
  debts,
  interestReclaimed,
}: IntelligenceUpgradeTeaserProps) {
  // Interest bleeding to lenders each month — a plain reduction over the user's
  // own active debts, identical to usePlannerComputed's monthlyInterestLeak.
  const monthlyInterest = useMemo(
    () =>
      debts
        .filter(isActiveDebt)
        .reduce((sum, d) => sum + (d.balance * d.interestRate) / 100 / 12, 0),
    [debts],
  );

  // Top APR-negotiation candidate (highest-APR credit card) and its annual
  // saving — the hook just wraps useDebts(), no Pro data involved.
  const { selectedCard, estimatedAnnualSavings } = useAprNegotiation();
  const aprSavings = estimatedAnnualSavings ?? 0;
  const hasAprWin = !!selectedCard && aprSavings > 0;

  const monthlyPrice = PLANS.pro.price;
  const upgrade = () => upgradeEvents.dispatch(FEATURE);

  const stats = [
    interestReclaimed > 0
      ? { label: "Avoidable interest", value: formatCurrencyWhole(interestReclaimed), tone: "#059669" }
      : null,
    monthlyInterest > 0
      ? { label: "Interest / mo", value: formatCurrencyWhole(monthlyInterest), tone: "#dc2626" }
      : null,
    hasAprWin
      ? { label: "APR cut / yr", value: formatCurrencyWhole(aprSavings), tone: "#059669" }
      : null,
  ].filter(Boolean) as { label: string; value: string; tone: string }[];

  const lockedRows = [
    hasAprWin
      ? `Negotiation script for ${selectedCard!.name} — save ~${formatCurrencyWhole(aprSavings)}/yr`
      : "APR negotiation scripts with dollar savings",
    "Strategy Lab & refinance flags",
    "Weekly coach brief & payoff forecasts",
  ];

  return (
    <div style={{ maxWidth: "720px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Real-numbers headline — the verdict, given free */}
      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "12px",
          padding: "20px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#2563eb",
          }}
        >
          Your plan, analyzed
        </span>
        <p style={{ fontSize: "14px", color: "#475569", margin: "6px 0 0", lineHeight: 1.5 }}>
          {stats.length > 0
            ? "Here's what your numbers already show. Pro turns each into a step-by-step move."
            : "Unlock your full payoff plan — coach brief, strategy scenarios, and negotiation scripts."}
        </p>

        {stats.length > 0 && (
          <div
            className="grid grid-cols-1 sm:grid-cols-3"
            style={{ gap: "12px", marginTop: "16px" }}
          >
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(15,23,42,0.08)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#94a3b8",
                  }}
                >
                  {s.label}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    color: s.tone,
                    fontVariantNumeric: "tabular-nums",
                    marginTop: "2px",
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loss-framed anchor: monthly interest vs the price to fight it */}
      {monthlyInterest > 0 && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.09)",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "rgba(220,38,38,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <TrendingDown size={19} strokeWidth={2.2} style={{ color: "#dc2626" }} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Interest going to lenders this month
              </div>
              <div
                className="mono"
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#dc2626",
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.1,
                }}
              >
                {formatCurrencyWhole(monthlyInterest)}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "16px",
              paddingTop: "16px",
              borderTop: "1px solid rgba(15,23,42,0.07)",
              flexWrap: "wrap",
            }}
          >
            <div>
              <span
                className="mono"
                style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}
              >
                {formatCurrencyWhole(monthlyPrice)}
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                /mo · {PRO_TRIAL_DAYS}-day free trial
              </span>
            </div>
            <button
              type="button"
              onClick={upgrade}
              className="glow-primary"
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 18px",
                borderRadius: "8px",
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              <Zap size={13} />
              Start Pro
            </button>
          </div>
        </div>
      )}

      {/* Gated depth — what a Pro upgrade unlocks, named honestly */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {lockedRows.map((label) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(15,23,42,0.08)",
              background: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "7px",
                  background: "#eef4ff",
                  border: "1px solid #bfdbfe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Lock size={13} style={{ color: "#2563eb" }} />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>{label}</span>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#2563eb",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "999px",
                padding: "2px 9px",
                flexShrink: 0,
              }}
            >
              Pro
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={upgrade}
        style={{
          padding: "12px 18px",
          borderRadius: "8px",
          border: "none",
          background: "#2563eb",
          color: "#ffffff",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 700,
          width: "100%",
        }}
      >
        See the full plan → Upgrade to Pro
      </button>
    </div>
  );
}
