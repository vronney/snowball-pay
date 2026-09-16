"use client";

import type { AccelerationView } from "@/lib/dashboard/plan";
import { CARD, EYEBROW } from "../styles";

interface AccelerationCardProps {
  view: AccelerationView;
  value: number;
  onChange: (amount: number) => void;
  saving: boolean;
}

/**
 * README §3b: the slider, $0 → available. The same input as v1's
 * (CashFlowOverview.tsx:80-88: step 50, the same state write) and the same
 * id, so RollForwardAdvice's "review" scroll still lands here.
 */
export default function AccelerationCard({ view, value, onChange, saving }: AccelerationCardProps) {
  return (
    <section id="cash-flow-overview" aria-label="Acceleration" className={`${CARD} scroll-mt-24 p-4`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`${EYEBROW} text-txt-muted`}>Extra toward debt each month</p>
        <p className="mono text-[14px] font-extrabold text-action">
          {view.value}
          {saving && <span className="ml-2 text-[10px] font-semibold text-txt-muted">saving…</span>}
        </p>
      </div>
      <input
        type="range"
        aria-label="Apply to Acceleration"
        min={0}
        max={view.max}
        step={50}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-3 w-full cursor-pointer accent-action"
      />
      <div className="mt-1 flex justify-between text-[11px] text-txt-muted">
        <span>$0</span>
        <span>{view.maxLabel}</span>
      </div>
    </section>
  );
}
