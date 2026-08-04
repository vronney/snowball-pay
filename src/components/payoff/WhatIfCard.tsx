"use client";

import { useMemo } from "react";
import { useSubscription } from "@/lib/hooks";
import { upgradeEvents } from "@/lib/upgradeEvents";
import { Events, track } from "@/lib/analytics";
import { PRO_TRIAL_DAYS } from "@/lib/billing";
import { Lock, Zap as ZapIcon } from "lucide-react";
import { type Debt, type Income, type Expense } from "@/types";
import { type PayoffMethod } from "@/lib/snowball";
import { calculateResultByMethod } from "@/lib/payoffPlan";
import { formatCurrencyWhole, formatMonths } from "@/lib/utils";
import { isActiveDebt } from "@/lib/monthlyFocusDebt";

interface WhatIfCardProps {
  debts: Debt[];
  income: Income;
  expenses: Expense[];
  adjustedExtra: number;
  currentMonths: number;
  currentInterestPaid: number;
  payoffMethod: PayoffMethod;
  effectiveAcceleration?: number;
  availableCashFlow?: number;
  onAccelerationChange?: (amount: number) => void;
}

export default function WhatIfCard({
  debts,
  income,
  expenses,
  adjustedExtra,
  currentMonths,
  currentInterestPaid,
  payoffMethod,
  effectiveAcceleration,
  availableCashFlow,
  onAccelerationChange,
}: WhatIfCardProps) {
  const { data: subData } = useSubscription();
  const isPro = subData?.proEligible === true;


  const activeDebts = useMemo(() => debts.filter(isActiveDebt), [debts]);
  const recurringTotal = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses],
  );

  const scenario50 = useMemo(
    () =>
      calculateResultByMethod(
        activeDebts,
        income,
        recurringTotal,
        adjustedExtra + 50,
        payoffMethod,
      ),
    [activeDebts, income, recurringTotal, adjustedExtra, payoffMethod],
  );

  const scenario100 = useMemo(
    () =>
      calculateResultByMethod(
        activeDebts,
        income,
        recurringTotal,
        adjustedExtra + 100,
        payoffMethod,
      ),
    [activeDebts, income, recurringTotal, adjustedExtra, payoffMethod],
  );

  const saved50months = currentMonths - scenario50.months;
  const saved50interest = Math.max(
    0,
    currentInterestPaid - scenario50.totalInterestPaid,
  );
  const saved100months = currentMonths - scenario100.months;
  const saved100interest = Math.max(
    0,
    currentInterestPaid - scenario100.totalInterestPaid,
  );

  if (saved50months <= 0 && saved100months <= 0) return null;

  // Free tier: one REAL scenario shown live (reciprocity — the aha moment is
  // the user's own numbers, never a blurred mock), the second locked. All the
  // figures are genuinely computed; only apply + more scenarios are Pro.
  if (!isPro) {
    const openUpgrade = () => upgradeEvents.dispatch("What-if scenarios");
    return (
      <div
        className="rounded-2xl p-5"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
        }}
      >
        <h2 className="font-semibold text-base mb-1 flex items-center gap-2">
          <ZapIcon size={16} style={{ color: "#f59e0b" }} />
          What If You Paid a Little More?
        </h2>
        <p className="text-xs mb-4" style={{ color: "#64748b" }}>
          A real preview from your own plan — here&apos;s what an extra $50 a
          month does.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {/* Live sample: +$50, real numbers */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "12px",
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.18)",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#b45309",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "6px",
              }}
            >
              <span>+$50/mo extra</span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#b45309",
                  background: "rgba(245,158,11,0.14)",
                  borderRadius: "999px",
                  padding: "1px 7px",
                  whiteSpace: "nowrap",
                }}
              >
                Free preview
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "1px" }}>Payoff</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: saved50months > 0 ? "#059669" : "#94a3b8" }}>
                  {saved50months > 0 ? `${formatMonths(saved50months)} sooner` : "no change"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "1px" }}>Interest saved</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: saved50interest > 0 ? "#059669" : "#94a3b8" }}>
                  {saved50interest > 0 ? formatCurrencyWhole(saved50interest) : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Locked: +$100 and beyond */}
          <button
            onClick={openUpgrade}
            style={{
              padding: "14px 16px",
              borderRadius: "12px",
              background: "#f8fafc",
              border: "1px dashed rgba(15,23,42,0.14)",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "8px",
              fontFamily: "inherit",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#475569",
              }}
            >
              <Lock size={12} style={{ color: "#94a3b8" }} />
              +$100, +$250, any amount
            </span>
            <span style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
              Model any extra payment and apply it to your plan with one click.
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#2563eb",
                background: "rgba(37,99,235,0.08)",
                border: "1px solid rgba(37,99,235,0.18)",
                borderRadius: "999px",
                padding: "1px 7px",
              }}
            >
              Pro
            </span>
          </button>
        </div>

        {/* Truthful loss-framed footer: the user's own computed number */}
        <div
          style={{
            marginTop: "14px",
            paddingTop: "14px",
            borderTop: "1px solid rgba(15,23,42,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
            {saved100interest > saved50interest && saved100interest > 0 ? (
              <>
                At +$100/mo your plan keeps{" "}
                <strong style={{ color: "#0f172a" }}>{formatCurrencyWhole(saved100interest)}</strong>{" "}
                from going to interest.
              </>
            ) : (
              <>Scenarios apply straight to your committed plan on Pro.</>
            )}
          </p>
          <button
            onClick={openUpgrade}
            className="glow-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "8px 14px",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            <ZapIcon size={12} />
            Start my trial and test scenarios
          </button>
        </div>
        <p style={{ fontSize: "11px", color: "#94a3b8", margin: "8px 0 0" }}>
          $12/mo after a {PRO_TRIAL_DAYS}-day free trial · cancel anytime
        </p>
      </div>
    );
  }

  const fmtMonths = (n: number) =>
    n <= 0 ? "no change" : `${formatMonths(n)} sooner`;

  const scenarios = [
    {
      label: "+$50/mo",
      delta: 50,
      months: saved50months,
      interest: saved50interest,
    },
    {
      label: "+$100/mo",
      delta: 100,
      months: saved100months,
      interest: saved100interest,
    },
  ];

  const handleApply = (delta: number) => {
    if (!onAccelerationChange || effectiveAcceleration === undefined) return;
    const next = Math.min(
      effectiveAcceleration + delta,
      availableCashFlow ?? Infinity,
    );
    track(Events.WHAT_IF_APPLIED, { delta, next_acceleration: next });
    onAccelerationChange(next);
  };

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
      }}
    >
      <h2 className="font-semibold text-base mb-1 flex items-center gap-2">
        <ZapIcon size={16} style={{ color: "#f59e0b" }} />
        What If You Paid a Little More?
      </h2>
      <p className="text-xs mb-4" style={{ color: "#64748b" }}>
        See how a small boost to your monthly payment changes your payoff
        timeline and total interest.
      </p>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        {scenarios.map(({ label, delta, months, interest }) => (
          <div
            key={label}
            onClick={() => handleApply(delta)}
            style={{
              padding: "14px 16px",
              borderRadius: "12px",
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.18)",
              cursor: onAccelerationChange ? "pointer" : "default",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!onAccelerationChange) return;
              (e.currentTarget as HTMLDivElement).style.transform =
                "translateY(-1px)";
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                "0 4px 12px rgba(245,158,11,0.18)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "";
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#b45309",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{label} extra</span>
              {onAccelerationChange && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#d97706",
                    opacity: 0.8,
                  }}
                >
                  Apply →
                </span>
              )}
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    marginBottom: "1px",
                  }}
                >
                  Payoff
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: months > 0 ? "#059669" : "#94a3b8",
                  }}
                >
                  {fmtMonths(months)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    marginBottom: "1px",
                  }}
                >
                  Interest saved
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: interest > 0 ? "#059669" : "#94a3b8",
                  }}
                >
                  {interest > 0 ? formatCurrencyWhole(interest) : "—"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
