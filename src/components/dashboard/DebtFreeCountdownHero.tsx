"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrencyWhole, formatMonths } from "@/lib/utils";
import RadialGauge from "@/components/ui/RadialGauge";
import { cardSurface } from "@/lib/designTokens";

interface DebtFreeCountdownHeroProps {
  /** Months until debt-free on the current plan. */
  months: number;
  debtFreeDate: Date;
  /** Projected interest saved vs minimums-only. */
  interestSaved: number;
  /** Months sooner vs minimums-only. */
  monthsSaved: number;
  /** Principal paid so far across all debts (original − current). */
  totalPaid: number;
  /** Sum of original balances — the denominator for overall progress. */
  totalOriginal: number;
  /** False when no debt has a recorded original balance — the "of $X
   *  original" sub-line would then mislabel the current total as original. */
  hasOriginalBalances: boolean;
}

/** Animates a number from 0 to `target` over `duration` ms (ease-out cubic). */
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    startRef.current = null;

    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

/**
 * The dashboard's centerpiece: debt-free date, months remaining, overall
 * payoff progress, and interest reclaimed — one instrument card. Keying the
 * date block on `months` re-runs the entrance animation whenever the plan
 * recalculates, so logging a payment visibly moves the date.
 */
export default function DebtFreeCountdownHero({
  months,
  debtFreeDate,
  interestSaved,
  monthsSaved,
  totalPaid,
  totalOriginal,
  hasOriginalBalances,
}: DebtFreeCountdownHeroProps) {
  const animatedInterest = useCountUp(Math.round(interestSaved));
  const progressPct =
    totalOriginal > 0
      ? Math.min(100, Math.max(0, (totalPaid / totalOriginal) * 100))
      : 0;

  // The date is built in local time, so formatting it during render can
  // hydration-mismatch (server TZ vs viewer TZ near month boundaries).
  // Initial render uses a deterministic UTC formatting on both sides; a
  // post-mount effect swaps in the viewer's timezone (usually identical).
  const [dateStr, setDateStr] = useState(() =>
    debtFreeDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  );
  useEffect(() => {
    setDateStr(
      debtFreeDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    );
  }, [debtFreeDate]);

  const stats = [
    {
      label: "Interest reclaimed",
      value: interestSaved > 0 ? formatCurrencyWhole(animatedInterest) : "—",
      sub: "vs minimums only",
    },
    {
      label: "Sooner than minimums",
      value: monthsSaved > 0 ? formatMonths(monthsSaved) : "—",
      sub: "on your current plan",
    },
    {
      label: "Paid so far",
      value: totalPaid > 0 ? formatCurrencyWhole(totalPaid) : "$0",
      sub: hasOriginalBalances
        ? `of ${formatCurrencyWhole(totalOriginal)} original`
        : "across all debts",
    },
  ];

  return (
    <div style={cardSurface}>
      {/* Countdown row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          padding: "20px",
        }}
      >
        {/* Keyed on months: a plan change re-mounts the block and replays the
            win-moment entrance (celebration easing). */}
        <div
          key={months}
          style={{
            animation: "slideUp 0.46s cubic-bezier(0.22,1,0.36,1) both",
            minWidth: 0,
          }}
        >
          <div className="eyebrow" style={{ marginBottom: "6px" }}>
            Debt-free by
          </div>
          <div
            style={{
              fontSize: "clamp(24px, 5vw, 32px)",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            {dateStr}
          </div>
          <div
            className="mono"
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#2563eb",
              marginTop: "6px",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatMonths(months)} to go
          </div>
        </div>
        <RadialGauge pct={progressPct} />
      </div>

      {/* Statement-style stat row — hairline-segmented */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3"
        style={{ borderTop: "1px solid rgba(15,23,42,0.07)" }}
      >
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={i > 0 ? "border-t sm:border-t-0 sm:border-l" : ""}
            style={{ padding: "14px 20px", borderColor: "rgba(15,23,42,0.07)" }}
          >
            <div className="eyebrow" style={{ marginBottom: "3px" }}>
              {stat.label}
            </div>
            <div
              className="mono"
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "#0f172a",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
