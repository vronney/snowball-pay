"use client";

import type { StreakCell, StreakCellState } from "@/lib/dashboard/types";
import { monthLabelFromKey } from "@/lib/dashboard/progressTab";

// README §4b. The current month is amber, never red (D10, X9); inactive = before the user started.
const CELL: Record<StreakCellState, string> = {
  logged: "bg-success",
  currentComplete: "bg-success",
  current: "bg-warning",
  missed: "border border-streak-miss-border bg-streak-miss",
  future: "bg-streak-future",
  inactive: "bg-surface-2",
};
const STATE_LABEL: Record<StreakCellState, string> = {
  logged: "logged",
  currentComplete: "logged",
  current: "in progress",
  missed: "missed",
  future: "upcoming",
  inactive: "before you started",
};

/** 12 cells: 8 past months, this month, 3 future (spec §5.1 streakGrid). The single red cell is the point. */
export default function StreakGrid({ cells }: { cells: ReadonlyArray<StreakCell> }) {
  return (
    <ul aria-label="Payment months" className="grid grid-cols-12 gap-1">
      {cells.map((cell) => (
        <li
          key={cell.month}
          data-state={cell.state}
          aria-label={`${monthLabelFromKey(cell.month)}: ${STATE_LABEL[cell.state]}`}
          className={`h-[26px] rounded-[5px] ${CELL[cell.state]}`}
        />
      ))}
    </ul>
  );
}
