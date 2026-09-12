import { describe, it, expect } from 'vitest';
import {
  computeProgressStreak,
  computeProgressTotals,
  computeThisMonthPaidProgress,
} from '@/lib/dashboard/progress';
import { makeDebt, makeSnapshot } from './fixtures';

// ── Legacy copies (verbatim from the tabs as of 938a0f45) ────────────────────
function legacyThisMonth(debts: { balance: number; originalBalance: number }[]) {
  let paid = 0; let original = 0; let known = false;
  for (const d of debts) {
    const hasOriginal = d.originalBalance > 0;
    if (hasOriginal) known = true;
    const base = hasOriginal ? d.originalBalance : d.balance;
    original += base;
    paid += Math.max(0, base - d.balance);
  }
  return { totalPaid: paid, totalOriginal: original, hasOriginalBalances: known };
}
function legacyProgress(debts: { balance: number; originalBalance: number }[], snapshots: { recordedAt: string }[]) {
  const currentTotal = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const originalTotal = debts.reduce((sum, debt) => sum + (debt.originalBalance || debt.balance), 0);
  const totalPaid = Math.max(0, originalTotal - currentTotal);
  const paidOffCount = debts.filter((debt) => debt.balance <= 0).length;
  const monthKeys = Array.from(new Set(snapshots.map((s) => s.recordedAt.slice(0, 7)))).sort();
  let streak = 0;
  if (monthKeys.length) {
    streak = 1;
    for (let i = monthKeys.length - 1; i > 0; i -= 1) {
      const cur = new Date(`${monthKeys[i]}-01`);
      const prev = new Date(`${monthKeys[i - 1]}-01`);
      const diffMonths = (cur.getFullYear() - prev.getFullYear()) * 12 + cur.getMonth() - prev.getMonth();
      if (diffMonths === 1) streak += 1; else break;
    }
  }
  return { currentTotal, totalPaid, paidOffCount, streak, originalTotal };
}

const DEBT_SETS = [
  [],
  [makeDebt({ id: 'a', balance: 800, minimumPayment: 25, originalBalance: 1000 })],
  [
    makeDebt({ id: 'a', balance: 800, minimumPayment: 25, originalBalance: 1000 }),
    makeDebt({ id: 'b', balance: 1200, minimumPayment: 40, originalBalance: 1000 }), // grew
    makeDebt({ id: 'c', balance: 0, minimumPayment: 0, originalBalance: 500 }), // paid off
    makeDebt({ id: 'd', balance: 300, minimumPayment: 10, originalBalance: 0 }), // unknown origin
  ],
];
const SNAPSHOT_SETS = [
  [],
  [makeSnapshot('a', '2026-09', 800)],
  [makeSnapshot('a', '2026-06', 900), makeSnapshot('a', '2026-07', 850), makeSnapshot('b', '2026-08', 1100), makeSnapshot('a', '2026-09', 800)],
  [makeSnapshot('a', '2025-12', 950), makeSnapshot('a', '2026-01', 925), makeSnapshot('a', '2026-03', 900)], // gap
];

describe('dashboard progress extractions', () => {
  it.each(DEBT_SETS.map((d, i) => [i, d] as const))('This Month paid progress equals legacy (set %i)', (_i, debts) => {
    expect(computeThisMonthPaidProgress(debts)).toEqual(legacyThisMonth(debts));
  });

  it.each(DEBT_SETS.flatMap((d, i) => SNAPSHOT_SETS.map((s, j) => [i, j, d, s] as const)))(
    'Progress totals + streak equal legacy (debts %i, snapshots %i)',
    (_i, _j, debts, snapshots) => {
      const legacy = legacyProgress(debts, snapshots);
      expect({ ...computeProgressTotals(debts), streak: computeProgressStreak(snapshots) }).toEqual(legacy);
    },
  );

  it('counts consecutive snapshot months ending at the latest one', () => {
    expect(computeProgressStreak(SNAPSHOT_SETS[2])).toBe(4);
    expect(computeProgressStreak(SNAPSHOT_SETS[3])).toBe(1);
    expect(computeProgressStreak([])).toBe(0);
  });
});
