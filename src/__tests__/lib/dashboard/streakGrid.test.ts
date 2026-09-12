import { describe, it, expect } from 'vitest';
import { computeStreakGrid, snapshotMonthSet } from '@/lib/dashboard/streakGrid';
import { makeSnapshot } from './fixtures';

const TODAY = new Date(2026, 8, 12); // Sep 2026
const gap = (logged: number, expected: number) => ({ expected, logged, missed: [], missedMinimums: 0, notYetDue: expected - logged });
const months = (...ym: string[]) => new Set(ym);

describe('computeStreakGrid (spec §5.1, D10)', () => {
  it('lays out 8 past months, the current month and 3 future months', () => {
    const cells = computeStreakGrid(months('2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'), gap(3, 9), TODAY);
    expect(cells.map((c) => c.month)).toEqual([
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08',
      '2026-09', '2026-10', '2026-11', '2026-12',
    ]);
    expect(cells.map((c) => c.state)).toEqual([
      'inactive', 'logged', 'logged', 'logged', 'logged', 'logged', 'logged', 'logged',
      'current', 'future', 'future', 'future',
    ]);
  });

  it('marks a past month with no snapshot after the first one as missed', () => {
    const cells = computeStreakGrid(months('2026-05', '2026-06', '2026-08'), gap(9, 9), TODAY);
    expect(cells.find((c) => c.month === '2026-07')?.state).toBe('missed');
    expect(cells.find((c) => c.month === '2026-04')?.state).toBe('inactive');
  });

  it('never marks the current month red: amber while unlogged, complete when all are logged', () => {
    expect(computeStreakGrid(months('2026-08'), gap(3, 9), TODAY)[8].state).toBe('current');
    expect(computeStreakGrid(months('2026-08'), gap(9, 9), TODAY)[8].state).toBe('currentComplete');
    expect(computeStreakGrid(months('2026-08'), null, TODAY)[8].state).toBe('currentComplete');
  });

  it('shows every past month as inactive when there are no snapshots', () => {
    expect(computeStreakGrid(new Set(), gap(0, 3), TODAY).slice(0, 8).every((c) => c.state === 'inactive')).toBe(true);
  });

  it('crosses year boundaries', () => {
    const cells = computeStreakGrid(months('2025-12'), gap(1, 1), new Date(2026, 1, 3)); // Feb 2026
    expect(cells[0].month).toBe('2025-06');
    expect(cells[8].month).toBe('2026-02');
    expect(cells[11].month).toBe('2026-05');
  });

  it('builds the month set from snapshot dates', () => {
    expect(snapshotMonthSet([makeSnapshot('a', '2026-07', 1), makeSnapshot('b', '2026-07', 2), makeSnapshot('a', '2026-08', 1)]))
      .toEqual(new Set(['2026-07', '2026-08']));
  });
});
