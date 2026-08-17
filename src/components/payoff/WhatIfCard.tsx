"use client";

import { useMemo } from "react";
import { useSubscription } from "@/lib/hooks";
import { upgradeEvents } from "@/lib/upgradeEvents";
import { Events, track } from "@/lib/analytics";
import { Lock, Zap as ZapIcon } from "lucide-react";
import { type Debt, type Income, type Expense } from "@/types";
import { type PayoffMethod } from "@/lib/snowball";
import { calculateResultByMethod } from "@/lib/payoffPlan";
import { formatCurrencyWhole, formatMonths } from "@/lib/utils";
import { isActiveDebt } from "@/lib/monthlyFocusDebt";
import { color, easing } from "@/lib/designTokens";
import { isRungApplicable, ladderHeadroom, rungCaption } from "@/components/payoff/whatIfLadder";

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

  // Free users only ever render the +$50 and +$100 figures, so don't simulate
  // rungs they'll never see — each step is a full amortization run.
  const stepDeltas = useMemo(
    () => (isPro ? [25, 50, 100, 200] : [50, 100]),
    [isPro],
  );

  const ladder = useMemo(
    () =>
      stepDeltas.map((delta) => {
        const result = calculateResultByMethod(
          activeDebts,
          income,
          recurringTotal,
          adjustedExtra + delta,
          payoffMethod,
        );
        return {
          delta,
          label: `+$${delta}/mo`,
          months: result.months,
          interest: result.totalInterestPaid,
          savedMonths: currentMonths - result.months,
          savedInterest: Math.max(
            0,
            currentInterestPaid - result.totalInterestPaid,
          ),
        };
      }),
    [
      stepDeltas,
      activeDebts,
      income,
      recurringTotal,
      adjustedExtra,
      payoffMethod,
      currentMonths,
      currentInterestPaid,
    ],
  );

  const rung = (delta: number) => ladder.find((s) => s.delta === delta);
  const saved50months = rung(50)?.savedMonths ?? 0;
  const saved50interest = rung(50)?.savedInterest ?? 0;
  const saved100interest = rung(100)?.savedInterest ?? 0;

  // Hide only when NO rung improves EITHER months or interest — an extra
  // payment can leave the payoff month unchanged while still cutting interest,
  // and that benefit is worth showing.
  if (ladder.every((s) => s.savedMonths <= 0 && s.savedInterest <= 0)) {
    return null;
  }

  // Free tier: one REAL scenario shown live (reciprocity — the aha moment is
  // the user's own numbers, never a blurred mock), the second locked. All the
  // figures are genuinely computed; only apply + more scenarios are Pro.
  if (!isPro) {
    const openUpgrade = () => upgradeEvents.dispatch("What-if scenarios");
    return (
      <div
        className="rounded-xl p-5"
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
              +$100 and one-click apply
            </span>
            <span style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
              Preview +$50 and +$100 side-by-side without touching your
              committed plan — then apply either in one click.
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
            Upgrade and test scenarios
          </button>
        </div>
        <p style={{ fontSize: "11px", color: "#94a3b8", margin: "8px 0 0" }}>
          $12/mo · cancel anytime
        </p>
      </div>
    );
  }

  // Headroom left before a rung would be clamped on apply. handleApply caps at
  // availableCashFlow, so a rung above this can't actually be applied in full —
  // clicking it would quietly deliver less than the tile promises. Those rungs
  // stay visible (the projection is still a true "what if") but drop the apply
  // affordance and say what they'd need instead. Logic lives in whatIfLadder.ts
  // so those rules can be tested without rendering.
  const headroom = ladderHeadroom(availableCashFlow, effectiveAcceleration);

  const canApply = (delta: number) =>
    isRungApplicable(
      delta,
      headroom,
      !!onAccelerationChange,
      effectiveAcceleration,
    );

  const handleApply = (delta: number) => {
    if (!canApply(delta)) return;
    const next = Math.min(
      effectiveAcceleration! + delta,
      availableCashFlow ?? Infinity,
    );
    track(Events.WHAT_IF_APPLIED, { delta, next_acceleration: next });
    onAccelerationChange!(next);
  };

  return (
    <div
      className="rounded-xl p-5"
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

      {/* Ladder: the committed plan first, then each rung. Every tile reads as
          an absolute outcome so the row is comparable left to right; the saving
          against the current plan is the line underneath. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "12px",
            background: color.tint,
            border: `1px solid ${color.tintBorder}`,
          }}
        >
          <div className="eyebrow" style={{ color: color.primary, marginBottom: "8px" }}>
            Current plan
          </div>
          <div
            className="mono"
            style={{ fontSize: "17px", fontWeight: 800, color: color.text, fontVariantNumeric: "tabular-nums" }}
          >
            {formatMonths(currentMonths)}
          </div>
          <div
            className="mono"
            style={{ fontSize: "11px", color: color.faint, marginTop: "2px", fontVariantNumeric: "tabular-nums" }}
          >
            {formatCurrencyWhole(currentInterestPaid)} interest
          </div>
          <div style={{ fontSize: "11px", color: color.muted, marginTop: "6px" }}>
            where you are now
          </div>
        </div>

        {ladder.map(({ label, delta, months, interest, savedMonths, savedInterest }) => {
          const applicable = canApply(delta);
          return (
            <button
              key={label}
              type="button"
              onClick={() => handleApply(delta)}
              // aria-disabled, not disabled: `disabled` drops the tile out of
              // the tab order, so the aria-label explaining WHY a rung is out
              // of reach would never be announced — the users most likely to
              // need that explanation are the ones who can't see the dashed
              // border. handleApply already returns early, so it stays inert.
              aria-disabled={!applicable}
              // A real button, not a clickable div: these were unreachable by
              // keyboard before, and the row is now five of them.
              aria-label={
                applicable
                  ? `Apply ${label} extra to your plan`
                  : `${label} extra — beyond your current cash flow`
              }
              style={{
                padding: "14px 16px",
                borderRadius: "12px",
                background: applicable ? "rgba(245,158,11,0.06)" : "#f8fafc",
                border: `1px ${applicable ? "solid rgba(245,158,11,0.18)" : "dashed rgba(15,23,42,0.14)"}`,
                cursor: applicable ? "pointer" : "default",
                textAlign: "left",
                fontFamily: "inherit",
                transition: `background 0.2s ${easing.enter}`,
              }}
            >
              <div
                className="eyebrow"
                style={{ color: applicable ? "#b45309" : color.muted, marginBottom: "8px" }}
              >
                {label}
              </div>
              <div
                className="mono"
                style={{ fontSize: "17px", fontWeight: 800, color: color.text, fontVariantNumeric: "tabular-nums" }}
              >
                {formatMonths(months)}
              </div>
              <div
                className="mono"
                style={{ fontSize: "11px", color: color.faint, marginTop: "2px", fontVariantNumeric: "tabular-nums" }}
              >
                {formatCurrencyWhole(interest)} interest
              </div>
              <div
                style={{
                  fontSize: "11px",
                  marginTop: "6px",
                  fontWeight: 600,
                  color: applicable ? color.successDeep : color.muted,
                }}
              >
                {rungCaption(
                  { delta, savedMonths, savedInterest },
                  headroom,
                  applicable,
                )}
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
}
