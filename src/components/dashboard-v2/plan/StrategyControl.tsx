"use client";

import type { PayoffMethod } from "@/lib/snowball";
import { methodLabel, type StrategyPairView } from "@/lib/dashboard/plan";
import GatedTile from "../GatedTile";
import { CARD, EYEBROW } from "../styles";

/** StrategySelector.tsx's feature key: the same UpgradeModal copy. */
const CUSTOM_FEATURE = "Custom priority order";

interface StrategyControlProps {
  method: PayoffMethod;
  onChange: (method: PayoffMethod) => void;
  /**
   * Whether Custom is open to this account. Undefined until the subscription
   * resolves: then Custom is neither gated nor selectable, so a Pro user never
   * sees a flash of "— Pro" (StrategySelector.tsx:16-19).
   */
  customOpen: boolean | undefined;
  pair: StrategyPairView | null;
}

const SEGMENT =
  "flex min-h-11 flex-1 items-center justify-center rounded-[9px] border text-[13px] font-extrabold outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60";
const SEGMENT_ON = "border-action/40 bg-action/10 text-action";
const SEGMENT_OFF = "border-border bg-surface text-txt-muted hover:bg-bg";

/**
 * README §3a: the three-up control, then the comparison pair and its caption.
 * The comparison and the switch are free (the handoff's "deliberate" note);
 * only Custom ordering is gated, exactly as v1's StrategySelector gates it.
 */
export default function StrategyControl({ method, onChange, customOpen, pair }: StrategyControlProps) {
  const segment = (m: PayoffMethod, disabled = false) => (
    <button
      key={m}
      type="button"
      aria-pressed={method === m}
      disabled={disabled}
      onClick={() => onChange(m)}
      className={`${SEGMENT} ${method === m ? SEGMENT_ON : SEGMENT_OFF}`}
    >
      {methodLabel(m)}
    </button>
  );
  // A saved Custom stays usable after a downgrade: the server grandfathers it.
  const customGated = customOpen === false && method !== "custom";
  return (
    <section aria-label="Strategy" className={`${CARD} p-4`}>
      <div className="flex gap-2">
        {segment("snowball")}
        {segment("avalanche")}
        {customGated ? (
          <GatedTile
            label="Custom"
            feature={CUSTOM_FEATURE}
            className="flex-1 !items-center !justify-center !rounded-[9px] !py-0"
          />
        ) : (
          segment("custom", customOpen === undefined && method !== "custom")
        )}
      </div>
      {pair && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {/* Tinted as the active choice's readout (an active state, DESIGN.md). */}
            <div className="rounded-lg border border-action/30 bg-action/10 px-3 py-2">
              <p className={`${EYEBROW} text-txt-muted`}>{pair.yours.label}</p>
              <p className="mono mt-1 text-[16px] font-extrabold text-txt">{pair.yours.figure}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg px-3 py-2">
              <p className={`${EYEBROW} text-txt-muted`}>{pair.other.label}</p>
              <p className={`mono mt-1 text-[16px] font-extrabold ${pair.other.cheaper ? "text-success-text" : "text-txt"}`}>
                {pair.other.figure}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[12px] leading-[1.5] text-txt-muted [text-wrap:pretty]">{pair.caption}</p>
        </>
      )}
    </section>
  );
}
