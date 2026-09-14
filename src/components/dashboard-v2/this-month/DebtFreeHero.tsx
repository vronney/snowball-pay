"use client";

import { useId } from "react";
import RadialGauge from "@/components/ui/RadialGauge";
import type { HeroView } from "@/lib/dashboard/thisMonth";
import { CARD, EYEBROW } from "../styles";
import { useMeterValue } from "../useMeterValue";

/** README §1c. The ring is v1 This Month's paid-off share; "to go" stays muted (passive, so not blue). */
export default function DebtFreeHero({ view }: { view: HeroView }) {
  const titleId = useId();
  const pct = useMeterValue(view.paidPct);
  return (
    <section
      aria-labelledby={titleId}
      className={`${CARD} flex items-center justify-between gap-4 overflow-hidden px-4 py-[18px] min-[1024px]:px-5`}
    >
      <div className="min-w-0">
        <h2 id={titleId} className={`${EYEBROW} text-txt-muted`}>Debt-free by</h2>
        <p className="mt-1.5 text-[30px] font-extrabold leading-none tracking-[-0.03em] text-txt [text-wrap:pretty]">
          {view.dateLabel}
        </p>
        <p className="mono mt-2 text-[14px] font-bold text-txt-muted">{view.toGo}</p>
      </div>
      <RadialGauge pct={pct} size={56} />
    </section>
  );
}
