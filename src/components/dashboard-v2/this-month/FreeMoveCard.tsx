"use client";

import { useId } from "react";
import type { FreeMoveAction, FreeMoveView } from "@/lib/dashboard/thisMonth";
import { CARD, CTA_BLUE, ERROR_LINE, EYEBROW } from "../styles";
import MoreMovesRow from "./MoreMovesRow";

interface FreeMoveCardProps {
  view: FreeMoveView;
  onAction: (action: FreeMoveAction) => void;
  onMoreMoves: () => void;
  /** A one-tap action (the strategy switch, the apply) is saving. */
  pending?: boolean;
  error?: string | null;
  /** Coach drops the chip (README §5b: "same card as This Month (d), minus the priority chip"). */
  showPriority?: boolean;
}

/**
 * README §1d: one coach move, fully readable and usable on Free, and the
 * count of the gated ones. Desktop (§6): copy left, a 250px action column right.
 */
export default function FreeMoveCard({
  view, onAction, onMoreMoves, pending = false, error = null, showPriority = true,
}: FreeMoveCardProps) {
  const titleId = useId();
  const { cta } = view;
  const hasActions = cta !== null || view.moreCount > 0;
  return (
    <section
      aria-labelledby={titleId}
      className={`${CARD} p-4 min-[1024px]:flex min-[1024px]:items-start min-[1024px]:justify-between min-[1024px]:gap-8 min-[1024px]:p-5`}
    >
      <div className="min-w-0 min-[1024px]:max-w-[620px] min-[1024px]:flex-1">
        <div className="flex items-center justify-between gap-3 min-[1024px]:justify-start">
          <span className={`${EYEBROW} text-action`}>{view.eyebrow}</span>
          {showPriority && (
            <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-txt">
              {view.priority}
            </span>
          )}
        </div>
        <h2 id={titleId} className="mt-1.5 text-[16px] font-extrabold tracking-[-0.01em] text-txt [text-wrap:pretty] min-[1024px]:text-[19px]">
          {view.copy.title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-txt-muted [text-wrap:pretty]">{view.copy.body}</p>
      </div>
      {hasActions && (
        <div className="mt-3 flex flex-col gap-2 min-[1024px]:mt-0 min-[1024px]:w-[250px] min-[1024px]:shrink-0">
          {cta && (
            <button type="button" onClick={() => onAction(cta.action)} disabled={pending} className={CTA_BLUE}>
              {pending ? "Saving…" : cta.label}
            </button>
          )}
          {error && <p role="alert" className={ERROR_LINE}>{error}</p>}
          {view.moreCount > 0 && (
            <div className={cta ? "border-t border-border pt-1" : undefined}>
              <MoreMovesRow count={view.moreCount} onOpen={onMoreMoves} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
