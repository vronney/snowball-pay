// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlannerComputed } from '@/lib/hooks/usePlannerComputed';
import { makeDebt, makeIncome, makeResult } from './dashboard/fixtures';

describe('usePlannerComputed priorityQueue', () => {
  it("lists only the plan's debts in attack order (spec §6.2)", () => {
    const debts = [
      makeDebt({ id: 'outside', balance: 50, minimumPayment: 25, inPlan: false }),
      makeDebt({ id: 'big', balance: 4_000, minimumPayment: 90 }),
      makeDebt({ id: 'small', balance: 400, minimumPayment: 25 }),
    ];
    const result = makeResult([['Sep 2026', 4_450], ['Oct 2026', 0]]);
    const { result: hook } = renderHook(() =>
      usePlannerComputed(debts, makeIncome(), 'snowball', result, result, 500, 300, [], false),
    );
    expect(hook.current.priorityQueue.map((d) => d.id)).toEqual(['small', 'big']);
  });
});
