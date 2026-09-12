import { describe, it, expect } from 'vitest';
import { computePlanReadiness, firstIncompleteStep } from '@/lib/dashboard/readiness';

const debt = (balance: number, dueDate?: number | null) => ({ balance, dueDate });

describe('computePlanReadiness (spec §5.1)', () => {
  it('starts at 0 of 5 for a brand-new account, and the first step is debts', () => {
    const r = computePlanReadiness({ debts: [], income: null, recurringExpenseCount: 0, hasAnyPayment: false });
    expect(r.completeCount).toBe(0);
    expect(r.percent).toBe(0);
    expect(firstIncompleteStep(r)?.id).toBe('debts');
  });

  it('credits debts, income and expenses, and counts debts missing a due day', () => {
    const debts = [debt(100, 5), debt(200, 12), ...Array.from({ length: 7 }, () => debt(50, null))];
    const r = computePlanReadiness({
      debts,
      income: { monthlyTakeHome: 4000, essentialExpenses: 2000 },
      recurringExpenseCount: 0,
      hasAnyPayment: false,
    });
    expect(r.steps.map((s) => [s.id, s.complete, s.pendingCount])).toEqual([
      ['debts', true, 0],
      ['income', true, 0],
      ['expenses', true, 0],
      ['dueDates', false, 7],
      ['firstPayment', false, 1],
    ]);
    expect(r.completeCount).toBe(3);
    expect(r.percent).toBe(60);
    expect(firstIncompleteStep(r)).toEqual({ id: 'dueDates', complete: false, pendingCount: 7 });
  });

  it('accepts recurring expenses alone for the expenses step', () => {
    const r = computePlanReadiness({
      debts: [debt(100, 1)],
      income: { monthlyTakeHome: 3000, essentialExpenses: 0 },
      recurringExpenseCount: 2,
      hasAnyPayment: false,
    });
    expect(r.steps.find((s) => s.id === 'expenses')?.complete).toBe(true);
  });

  it('ignores paid-off debts when counting missing due days', () => {
    const r = computePlanReadiness({
      debts: [debt(100, 3), debt(0, null)],
      income: { monthlyTakeHome: 3000, essentialExpenses: 1000 },
      recurringExpenseCount: 0,
      hasAnyPayment: true,
    });
    expect(r.completeCount).toBe(5);
    expect(r.percent).toBe(100);
    expect(firstIncompleteStep(r)).toBeNull();
  });

  it('reports dueDates as complete-shaped (pendingCount 0) with no active debts, and the first incomplete step is debts', () => {
    const r = computePlanReadiness({ debts: [], income: null, recurringExpenseCount: 0, hasAnyPayment: false });
    expect(r.steps.find((s) => s.id === 'dueDates')).toEqual({ id: 'dueDates', complete: false, pendingCount: 0 });
    expect(firstIncompleteStep(r)?.id).toBe('debts');
  });

  it('treats a zero take-home as incomplete income', () => {
    const r = computePlanReadiness({
      debts: [debt(100, 3)],
      income: { monthlyTakeHome: 0, essentialExpenses: 0 },
      recurringExpenseCount: 0,
      hasAnyPayment: false,
    });
    expect(r.steps.find((s) => s.id === 'income')?.complete).toBe(false);
  });
});
