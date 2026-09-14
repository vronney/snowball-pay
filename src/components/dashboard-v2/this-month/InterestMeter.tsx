"use client";

import { useId } from "react";
import type { InterestView } from "@/lib/dashboard/thisMonth";
import { EYEBROW } from "../styles";
import { useMeterValue } from "../useMeterValue";

/**
 * README §1b: the price anchor. This month's estimate (balance × APR ÷ 12,
 * labelled est.) against the plan's average monthly saving (labelled avg):
 * never "so far", never a split of the same dollars (spec X1, X2).
 */
export default function InterestMeter({ view }: { view: InterestView }) {
  const titleId = useId();
  const share = useMeterValue(view.lenderShare ?? 0);
  return (
    <section aria-labelledby={titleId} className="rounded-xl border border-danger/25 bg-surface p-4 shadow-card min-[1024px]:p-5">
      <h2 id={titleId} className={`${EYEBROW} text-txt-muted`}>Interest going to lenders this month</h2>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="mono text-[36px] font-extrabold leading-none tracking-[-0.03em] text-danger min-[1024px]:text-[40px]">
          {view.figure}
        </span>
        <span className="text-[12px] text-txt-muted">est.</span>
      </p>
      {view.lenderShare !== null && (
        // The line below states both figures, so the bar is decoration for screen readers.
        <div aria-hidden="true" className="mt-3 flex h-2 overflow-hidden rounded-full bg-success">
          <div
            data-meter="lenders"
            className="h-full bg-danger transition-[width] duration-[600ms] ease-out motion-reduce:transition-none"
            style={{ width: `${share}%` }}
          />
        </div>
      )}
      {view.avgLine && (
        <p className="mt-2 text-[11px] font-semibold text-success-text [text-wrap:pretty]">{view.avgLine}</p>
      )}
    </section>
  );
}
