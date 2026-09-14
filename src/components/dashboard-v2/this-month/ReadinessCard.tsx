"use client";

import { useId } from "react";
import type { ReadinessStepId } from "@/lib/dashboard/types";
import type { ReadinessView } from "@/lib/dashboard/thisMonth";
import { CARD, EYEBROW } from "../styles";
import { useMeterValue } from "../useMeterValue";

interface ReadinessCardProps {
  view: ReadinessView;
  /** A chip or the CTA was pressed. `via` lets the caller track CTA presses only. */
  onStep: (step: ReadinessStepId, via: "cta" | "chip") => void;
}

/** 32px pill; the ::before extends the hit area to 44px (the row gap is 12px, so targets never overlap). */
const CHIP =
  "relative inline-flex min-h-8 items-center rounded-full border px-2.5 text-[11px] font-bold outline-none before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] focus-visible:outline-2 focus-visible:outline-action";

/** README §1a, endowed progress: opens at the user's real count and disappears at 5 of 5. */
export default function ReadinessCard({ view, onStep }: ReadinessCardProps) {
  const titleId = useId();
  const fill = useMeterValue(view.percent);
  return (
    <section
      aria-labelledby={titleId}
      className={`${CARD} px-4 py-3.5 min-[1024px]:flex min-[1024px]:items-center min-[1024px]:gap-6 min-[1024px]:px-6 min-[1024px]:py-5`}
    >
      <div className="min-w-0 min-[1024px]:flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={titleId} className={`${EYEBROW} text-txt-muted`}>{view.title}</h2>
          <span className="mono text-[12px] font-extrabold text-action">{view.counter}</span>
        </div>
        <div
          role="progressbar"
          aria-labelledby={titleId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={view.percent}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-action transition-[width] duration-[600ms] ease-out motion-reduce:transition-none"
            style={{ width: `${fill}%` }}
          />
        </div>
        <ul className="mt-2.5 flex flex-wrap gap-x-1.5 gap-y-3">
          {view.chips.map((chip) => (
            <li key={chip.id}>
              <button
                type="button"
                onClick={() => onStep(chip.id, "chip")}
                className={`${CHIP} ${chip.complete ? "border-success/25 bg-success/10 text-success-text" : "border-border bg-bg text-txt-muted"}`}
              >
                {chip.complete && <span aria-hidden="true">✓&nbsp;</span>}
                {chip.label}
                <span className="sr-only">{chip.complete ? ", done" : ", to do"}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={() => onStep(view.cta.step, "cta")}
        className="mt-3 flex min-h-[46px] w-full items-center justify-center rounded-lg bg-ink px-5 text-[14px] font-extrabold text-white shadow-cta-ink outline-none hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action min-[1024px]:mt-0 min-[1024px]:min-h-11 min-[1024px]:w-auto min-[1024px]:shrink-0 min-[1024px]:whitespace-nowrap"
      >
        {view.cta.label}
      </button>
    </section>
  );
}
