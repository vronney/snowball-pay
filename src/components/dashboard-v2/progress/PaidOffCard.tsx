"use client";

import { useId } from "react";
import type { PaidOffView } from "@/lib/dashboard/progressTab";
import { CARD, EYEBROW } from "../styles";
import { useMeterValue } from "../useMeterValue";

/** README §4a: the paid-off figure over the starting total, with an 8px bar that fills once. */
export default function PaidOffCard({ view }: { view: PaidOffView }) {
  const titleId = useId();
  const pct = useMeterValue(view.pct);
  return (
    <section aria-labelledby={titleId} className={`${CARD} p-4`}>
      <h2 id={titleId} className={`${EYEBROW} text-txt-muted`}>Paid off since you started</h2>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="mono text-[34px] font-extrabold leading-none tracking-[-0.03em] text-success-text">{view.figure}</span>
        <span className="text-[13px] font-semibold text-txt-muted">{view.ofLine}</span>
      </p>
      {/* The line above states both figures, so the bar is decoration for screen readers. */}
      <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          data-meter="paid"
          className="h-full rounded-full bg-success transition-[width] duration-[600ms] ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
