"use client";

import { useId } from "react";
import type { RateWatchView } from "@/lib/dashboard/thisMonth";
import { CARD, EYEBROW } from "../styles";

/** README §6 (desktop only): the yearly APR-cut estimate, labelled as one (spec X10). */
export default function RateWatchCard({ view }: { view: RateWatchView }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={`${CARD} p-4 min-[1024px]:p-5`}>
      <h2 id={titleId} className={`${EYEBROW} text-txt-muted`}>{view.eyebrow}</h2>
      <p className="mono mt-2 text-[28px] font-extrabold leading-none tracking-[-0.02em] text-success-text">
        {view.figure}
      </p>
      <p className="mt-2 text-[13px] text-txt-muted [text-wrap:pretty]">{view.caption}</p>
    </section>
  );
}
