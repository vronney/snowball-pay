"use client";

import type { MilestoneRowView } from "@/lib/dashboard/progressTab";
import { CARD, EYEBROW } from "../styles";

/**
 * README §4d. The "next" row is solid and muted, not the handoff's dashed
 * card: dashed borders mean only "outside the plan" (DESIGN.md 2026-09-12).
 */
export default function MilestonesCard({ rows }: { rows: ReadonlyArray<MilestoneRowView> }) {
  return (
    <section aria-label="Payoff milestones" className={`${CARD} p-4`}>
      <h2 className={`${EYEBROW} text-txt-muted`}>Payoff milestones</h2>
      <ul className="mt-2 flex flex-col gap-1.5">
        {rows.map((row) => (
          <li
            key={`${row.kind}-${row.title}`}
            className={`flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-[13px] ${
              row.kind === "next" ? "bg-bg text-txt-muted" : "bg-surface text-txt"
            }`}
          >
            <span className="min-w-0 truncate font-semibold">{row.title}</span>
            {row.detail && (
              <span className={`mono shrink-0 text-[12px] font-extrabold ${row.kind === "paidOff" ? "text-success-text" : "text-txt-muted"}`}>
                {row.detail}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
