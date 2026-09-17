"use client";

import { useId } from "react";
import type { MoreMovesView } from "@/lib/dashboard/coach";
import ProChip from "../ProChip";
import { CARD } from "../styles";

/**
 * README §5c, "the most important gate in the product": every gated move's
 * title and value are visible; the script, the steps and the apply are Pro.
 * The header is the gated control (aria-disabled, named "… — Pro"), as
 * MoreMovesRow is on This Month.
 */
export default function MoreMovesList({ view, onOpen }: { view: MoreMovesView; onOpen: () => void }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={`${CARD} overflow-hidden`}>
      <button
        type="button"
        aria-disabled="true"
        aria-label={`${view.heading} — Pro`}
        onClick={onOpen}
        className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-border px-4 text-left outline-none focus-visible:outline-2 focus-visible:outline-action"
      >
        <span id={headingId} className="text-[13px] font-extrabold text-txt">{view.heading}</span>
        <ProChip />
      </button>
      <ul className="divide-y divide-border">
        {view.rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="min-w-0 text-[13px] font-semibold text-txt [text-wrap:pretty]">{row.title}</span>
            <span className="mono shrink-0 text-[12px] font-extrabold text-success-text">{row.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
