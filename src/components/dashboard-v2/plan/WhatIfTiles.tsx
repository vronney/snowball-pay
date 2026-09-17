"use client";

import { GATED_WHAT_IF_DELTA, WHAT_IF_CAPTION, type WhatIfFreeTile } from "@/lib/dashboard/plan";
import { UPGRADE_FEATURE } from "@/lib/dashboard/upgradeFeatures";
import GatedTile from "../GatedTile";
import { CARD, EYEBROW } from "../styles";

/**
 * README §3c on Free: one real rung, two gated tiles. The free rung hides
 * when it changes nothing ("hide, never fake" — whatIfFreeTile); the gated
 * tiles carry no figure, so that rule doesn't apply to them and they still
 * show, in a two-column grid with no empty first cell.
 */
export default function WhatIfTiles({ tile }: { tile: WhatIfFreeTile | null }) {
  return (
    <section aria-label="What if" className={`${CARD} p-4`}>
      <p className={`${EYEBROW} text-txt-muted`}>What if you paid a little more?</p>
      <div className={`mt-2 grid gap-2 ${tile ? "grid-cols-3" : "grid-cols-2"}`}>
        {tile && (
          <div className="flex min-h-11 flex-col justify-center rounded-lg border border-focus-card-border bg-focus-card px-3 py-2">
            <p className="text-[11px] font-extrabold text-txt">{tile.label}</p>
            <p className="mt-1 text-[10px] font-bold text-success-text">{tile.result}</p>
          </div>
        )}
        <GatedTile label={`+$${GATED_WHAT_IF_DELTA}`} feature={UPGRADE_FEATURE.whatIf} />
        <GatedTile label="Any $" feature={UPGRADE_FEATURE.whatIf} />
      </div>
      <p className="mt-2 text-[11px] text-txt-muted [text-wrap:pretty]">{WHAT_IF_CAPTION}</p>
    </section>
  );
}
