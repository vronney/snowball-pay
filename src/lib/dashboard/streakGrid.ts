import type { PaymentGap, StreakCell, StreakCellState } from './types';

const PAST_MONTHS = 8;
const FUTURE_MONTHS = 3;

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "YYYY-MM" keys of every month with a balance snapshot (same source as the Progress streak). */
export function snapshotMonthSet(snapshots: ReadonlyArray<{ recordedAt: string }>): Set<string> {
  return new Set(snapshots.map((s) => s.recordedAt.slice(0, 7)));
}

/**
 * The Progress streak grid (spec §5.1, D10). Past months before the user's
 * first snapshot are "inactive", not "missed": they predate the plan. The
 * current month is never red: amber while any active debt is unlogged,
 * complete once all are logged. Red is only for a finished month with no
 * activity after the user started.
 */
export function computeStreakGrid(
  snapshotMonths: ReadonlySet<string>,
  gap: PaymentGap | null,
  today: Date,
): StreakCell[] {
  const firstMonth = [...snapshotMonths].sort()[0];
  const cells: StreakCell[] = [];
  for (let offset = -PAST_MONTHS; offset <= FUTURE_MONTHS; offset += 1) {
    const key = monthKey(new Date(today.getFullYear(), today.getMonth() + offset, 1));
    let state: StreakCellState;
    if (offset > 0) state = 'future';
    else if (offset === 0) state = gap && gap.logged < gap.expected ? 'current' : 'currentComplete';
    else if (!firstMonth || key < firstMonth) state = 'inactive';
    else state = snapshotMonths.has(key) ? 'logged' : 'missed';
    cells.push({ month: key, state });
  }
  return cells;
}
