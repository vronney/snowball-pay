"use client";

import { GATED_WHAT_IF_DELTA, WHAT_IF_CAPTION, type WhatIfFreeTile } from "@/lib/dashboard/plan";
import GatedTile from "../GatedTile";
import { CARD, EYEBROW } from "../styles";

/** WhatIfCard.tsx's feature key: the same UpgradeModal copy. */
export const WHAT_IF_FEATURE = "What-if scenarios";

/** README §3c on Free: one real rung, two gated tiles. */
export default function WhatIfTiles({ tile }: { tile: WhatIfFreeTile }) {
  return (
    <section aria-label="What if" className={`${CARD} p-4`}>
      <p className={`${EYEBROW} text-txt-muted`}>What if you paid a little more?</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="flex min-h-11 flex-col justify-center rounded-lg border border-focus-card-border bg-focus-card px-3 py-2">
          <p className="text-[11px] font-extrabold text-txt">{tile.label}</p>
          <p className="mt-1 text-[10px] font-bold text-success-text">{tile.result}</p>
        </div>
        <GatedTile label={`+$${GATED_WHAT_IF_DELTA}`} feature={WHAT_IF_FEATURE} />
        <GatedTile label="Any $" feature={WHAT_IF_FEATURE} />
      </div>
      <p className="mt-2 text-[11px] text-txt-muted [text-wrap:pretty]">{WHAT_IF_CAPTION}</p>
    </section>
  );
}
