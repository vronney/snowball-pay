import type { DebtsSummaryView } from "@/lib/dashboard/myDebts";
import { CARD, EYEBROW } from "../styles";

/**
 * Counted vs not counted (spec §8.5): shown only when debts sit outside the
 * plan. The red figure is 19px extrabold, large text for contrast (3:1).
 */
export default function DebtsSummary({ view }: { view: DebtsSummaryView }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className={`${CARD} px-3.5 py-3`}>
        <p className={`${EYEBROW} text-txt-muted`}>Counted</p>
        <p className="mono mt-1 text-[19px] font-extrabold tabular-nums text-txt">{view.counted}</p>
      </div>
      <div className="rounded-xl border border-dashed border-danger/35 bg-surface px-3.5 py-3">
        <p className={`${EYEBROW} text-txt-muted`}>Not counted</p>
        <p className="mono mt-1 text-[19px] font-extrabold tabular-nums text-danger">{view.notCounted}</p>
      </div>
    </div>
  );
}
