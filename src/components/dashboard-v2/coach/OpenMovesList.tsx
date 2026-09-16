"use client";

import type { OpenMoveRow } from "@/lib/dashboard/coach";
import type { CoachMoveId } from "@/lib/dashboard/types";
import { CARD, CTA_BLUE, ERROR_LINE, EYEBROW } from "../styles";

interface OpenMovesListProps {
  rows: ReadonlyArray<OpenMoveRow>;
  onAction: (row: OpenMoveRow) => void;
  /** The move whose one-tap save is running; while set, every row's CTA is disabled (save() serializes to one in-flight request at a time). */
  pendingId: CoachMoveId | null;
  error: string | null;
}

/** Pro and trial (spec §8.5 Coach): the same moves, every one open with its action. */
export default function OpenMovesList({ rows, onAction, pendingId, error }: OpenMovesListProps) {
  return (
    <section aria-label="Your moves" className={`${CARD} overflow-hidden`}>
      <ul className="divide-y divide-border">
        {rows.map((row) => {
          const pending = pendingId === row.move.id;
          return (
            <li
              key={row.move.id}
              className="flex flex-col gap-2 px-4 py-3 min-[1024px]:flex-row min-[1024px]:items-start min-[1024px]:justify-between min-[1024px]:gap-8"
            >
              <div className="min-w-0 min-[1024px]:flex-1">
                <div className="flex items-center justify-between gap-3 min-[1024px]:justify-start min-[1024px]:gap-4">
                  <span className={`${EYEBROW} text-txt-muted`}>{row.priority} priority</span>
                  {row.copy.valueLabel && (
                    <span className="mono text-[12px] font-extrabold text-success-text">{row.copy.valueLabel}</span>
                  )}
                </div>
                <h3 className="mt-1 text-[15px] font-extrabold tracking-[-0.01em] text-txt [text-wrap:pretty]">{row.copy.title}</h3>
                <p className="mt-1 text-[13px] leading-[1.55] text-txt-muted [text-wrap:pretty]">{row.copy.body}</p>
              </div>
              <div className="min-[1024px]:w-[220px] min-[1024px]:shrink-0">
                <button type="button" onClick={() => onAction(row)} disabled={pendingId !== null} className={CTA_BLUE}>
                  {pending ? "Saving…" : row.cta.label}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className={`mx-4 mb-3 ${ERROR_LINE}`}>{error}</p>}
    </section>
  );
}
