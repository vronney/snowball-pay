import { describe, expect, it } from 'vitest';
import { planScopedBalanceTotal, planScopedSnapshots } from '@/lib/actualBalance';
import { makeDebt, makeSnapshot } from './dashboard/fixtures';

describe('planScopedSnapshots', () => {
  it('returns the same array reference when no debt is outside the plan', () => {
    const debts = [makeDebt({ id: 'a', balance: 100, minimumPayment: 10 })];
    const snapshots = [makeSnapshot('a', '2026-08', 100)];
    expect(planScopedSnapshots(snapshots, debts)).toBe(snapshots);
  });

  it("drops an outside debt's snapshots", () => {
    const debts = [
      makeDebt({ id: 'a', balance: 100, minimumPayment: 10 }),
      makeDebt({ id: 'outside', balance: 500, minimumPayment: 20, inPlan: false }),
    ];
    const snapshots = [makeSnapshot('a', '2026-08', 100), makeSnapshot('outside', '2026-08', 500)];
    expect(planScopedSnapshots(snapshots, debts)).toEqual([snapshots[0]]);
  });

  it("keeps a snapshot whose debt isn't in the list (e.g. a deleted debt)", () => {
    const debts = [
      makeDebt({ id: 'a', balance: 100, minimumPayment: 10 }),
      makeDebt({ id: 'outside', balance: 500, minimumPayment: 20, inPlan: false }),
    ];
    const snapshots = [makeSnapshot('deleted', '2026-08', 300)];
    expect(planScopedSnapshots(snapshots, debts)).toEqual(snapshots);
  });
});

describe('planScopedBalanceTotal', () => {
  it('counts in-plan debts, paid-off included, and not outside debts', () => {
    const debts = [
      makeDebt({ id: 'a', balance: 100, minimumPayment: 10 }),
      makeDebt({ id: 'paid-off', balance: 0, minimumPayment: 0 }),
      makeDebt({ id: 'outside', balance: 500, minimumPayment: 20, inPlan: false }),
    ];
    expect(planScopedBalanceTotal(debts)).toBe(100);
  });
});
