"use client";

import { useMemo } from "react";
import { Debt } from "@/types";
import { Target } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface MilestoneWidgetProps {
  debts: Debt[];
}

interface Milestone {
  label: string;
  threshold: number;
  emoji: string;
}

const MILESTONES: Milestone[] = [
  { label: "Under $50,000 total debt", threshold: 50_000, emoji: "🎯" },
  { label: "Under $25,000 total debt", threshold: 25_000, emoji: "💪" },
  { label: "Under $10,000 total debt", threshold: 10_000, emoji: "🔥" },
  { label: "Under $5,000 total debt",  threshold: 5_000,  emoji: "🚀" },
  { label: "Debt Free!",               threshold: 0,       emoji: "🏆" },
];

export function MilestoneWidget({ debts }: MilestoneWidgetProps) {
  const totalBalance = useMemo(() => debts.reduce((s, d) => s + d.balance, 0), [debts]);

  // Sum of original balances — the real starting point for progress calculations.
  // Falls back to current balance for any debt that never had an original balance recorded.
  const totalOriginal = useMemo(
    () => debts.reduce((s, d) => s + (d.originalBalance > 0 ? d.originalBalance : d.balance), 0),
    [debts],
  );

  const nextMilestone = useMemo(() => {
    return MILESTONES.find((m) => totalBalance > m.threshold) ?? null;
  }, [totalBalance]);

  if (debts.length === 0 || nextMilestone === null) return null;

  // How much further to go to hit the next milestone
  const distance = totalBalance - nextMilestone.threshold;

  // The upper boundary of this band:
  //   - If there is a higher milestone in the list, use its threshold.
  //   - If this is the first (highest) milestone, use the real original total.
  //     This avoids fabricating a number when the user's balance exceeds all fixed thresholds.
  const milestoneIndex = MILESTONES.indexOf(nextMilestone);
  const bandTop =
    milestoneIndex > 0
      ? MILESTONES[milestoneIndex - 1].threshold   // the milestone above this one
      : Math.max(totalOriginal, totalBalance);      // real starting total

  const bandSize = bandTop - nextMilestone.threshold;
  // How far the user has travelled from bandTop down toward the milestone threshold
  const pct = bandSize > 0
    ? Math.min(100, Math.max(0, ((bandTop - totalBalance) / bandSize) * 100))
    : 0;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{
        background: "rgba(37,99,235,0.04)",
        border: "1px solid rgba(37,99,235,0.14)",
      }}
    >
      <div className="flex items-center gap-2">
        <Target size={14} style={{ color: "#2563eb", flexShrink: 0 }} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#2563eb" }}>
          Next milestone
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: "#111827" }}>
          {nextMilestone.emoji} {nextMilestone.label}
        </span>
        <span className="text-xs font-semibold mono" style={{ color: "#ef4444" }}>
          {formatCurrency(distance)} away
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(15,23,42,0.08)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #2563eb, #60a5fa)",
          }}
        />
      </div>

      <div className="flex justify-between text-xs" style={{ color: "#94a3b8" }}>
        <span>{Math.round(pct)}% of the way there</span>
        <span className="mono">{formatCurrency(nextMilestone.threshold)} goal</span>
      </div>
    </div>
  );
}
