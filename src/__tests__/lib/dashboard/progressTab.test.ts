import { describe, expect, it } from 'vitest';
import type { StreakCell } from '@/lib/dashboard/types';
import {
  gridCaptionView, milestonesView, monthLabelFromKey, paidOffView, streakPill, unloggedRows,
} from '@/lib/dashboard/progressTab';
import { makeDebt, makeSnapshot } from './fixtures';

const grid: StreakCell[] = [];

describe('streakPill (README §4)', () => {
  it('names the streak, and hides under one month', () => {
    expect(streakPill(7)).toBe('7-month streak');
    expect(streakPill(1)).toBe('1-month streak');
    expect(streakPill(0)).toBeNull();
    expect(streakPill(Number.NaN)).toBeNull();
  });
});

describe('paidOffView (README §4a; insights.progress is ProgressTab\'s own totals)', () => {
  it('states paid and starting totals in cents with the share', () => {
    expect(paidOffView({ paidToDate: 5_088, startingTotal: 51_652, streak: 7, grid })).toEqual({
      figure: '$5,088.00', ofLine: 'of $51,652.00', pct: (5_088 / 51_652) * 100,
    });
  });

  it('caps at 100%, floors negative paid at 0, and hides without a starting total', () => {
    expect(paidOffView({ paidToDate: 900, startingTotal: 800, streak: 0, grid })?.pct).toBe(100);
    expect(paidOffView({ paidToDate: -5, startingTotal: 800, streak: 0, grid })?.figure).toBe('$0.00');
    expect(paidOffView({ paidToDate: 0, startingTotal: 0, streak: 0, grid })).toBeNull();
    expect(paidOffView(null)).toBeNull();
  });
});

describe('gridCaptionView (spec §8.4 "Progress")', () => {
  const gap = (logged: number, expected: number) => ({ expected, logged, missed: [], missedMinimums: 0, notYetDue: expected - logged });

  it('counts every unlogged payment this month', () => {
    expect(gridCaptionView(gap(3, 9), 8)).toEqual({
      unlogged: 6, text: '6 of 9 September payments still unlogged.', cta: 'Keep the streak — log 6',
    });
  });

  it('is null once everything is logged, or without a gap', () => {
    expect(gridCaptionView(gap(9, 9), 8)).toBeNull();
    expect(gridCaptionView(null, 8)).toBeNull();
  });
});

describe('unloggedRows', () => {
  it('lists active debts without a record this month at their minimums', () => {
    const debts = [
      makeDebt({ id: 'a', name: 'Visa', balance: 900, minimumPayment: 25 }),
      makeDebt({ id: 'b', name: 'Car', balance: 9_000, minimumPayment: 310 }),
      makeDebt({ id: 'c', name: 'Old', balance: 0, minimumPayment: 40 }),
    ];
    expect(unloggedRows(debts, new Set(['a']))).toEqual([{ debtId: 'b', name: 'Car', amount: 310 }]);
  });
});

describe('monthLabelFromKey', () => {
  it('reads the key without a Date, so no time zone can move it', () => {
    expect(monthLabelFromKey('2026-03')).toBe('Mar 2026');
    expect(monthLabelFromKey('2026-12')).toBe('Dec 2026');
    expect(monthLabelFromKey('nope')).toBe('nope');
  });
});

describe('milestonesView (README §4d)', () => {
  const debts = [
    makeDebt({ id: 'caraway', name: 'Caraway', balance: 0, minimumPayment: 0 }),
    makeDebt({ id: 'old', name: 'Old card', balance: 0, minimumPayment: 0 }),
    makeDebt({ id: 'c1', name: 'CreditOne 6610', balance: 400, minimumPayment: 25 }),
    makeDebt({ id: 'c2', name: 'CreditOne 8959', balance: 2_000, minimumPayment: 60 }),
  ];
  const snapshots = [
    makeSnapshot('caraway', '2026-02', 120), makeSnapshot('caraway', '2026-03', 0), makeSnapshot('caraway', '2026-04', 0),
  ];
  const schedule = [{ debtId: 'c2', monthPaidOff: 11 }, { debtId: 'c1', monthPaidOff: 3 }, { debtId: 'caraway', monthPaidOff: 0 }];

  it('dates a payoff from its first $0 snapshot, leaves it undated otherwise, and names the next payoff from the schedule', () => {
    expect(milestonesView(debts, snapshots, schedule)).toEqual([
      { kind: 'paidOff', title: 'Caraway paid off', detail: 'Mar 2026' },
      { kind: 'paidOff', title: 'Old card paid off', detail: null },
      { kind: 'next', title: 'Next payoff · CreditOne 6610', detail: 'in 3m' },
    ]);
  });

  it('is empty with nothing paid off and no schedule', () => {
    expect(milestonesView([debts[2]], [], [])).toEqual([]);
  });
});
