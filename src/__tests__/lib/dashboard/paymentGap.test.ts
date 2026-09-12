import { describe, it, expect } from 'vitest';
import { computePaymentGap } from '@/lib/dashboard/paymentGap';
import { makeDebt } from './fixtures';

const TODAY = new Date(2026, 8, 12); // Sep 12, local
const DEBTS = [
  makeDebt({ id: 'a', balance: 500, minimumPayment: 25, dueDate: 5 }), // logged
  makeDebt({ id: 'b', balance: 900, minimumPayment: 100, dueDate: 10 }), // missed
  makeDebt({ id: 'c', balance: 700, minimumPayment: 40, dueDate: 20 }), // not yet due
  makeDebt({ id: 'd', balance: 300, minimumPayment: 15 }), // no due day: never "missed"
  makeDebt({ id: 'e', balance: 0, minimumPayment: 0, dueDate: 1 }), // paid off: excluded
];

describe('computePaymentGap (spec §5.1)', () => {
  it('splits active debts into logged, missed and not yet due', () => {
    const gap = computePaymentGap(DEBTS, [
      { debtId: 'a', dueYear: 2026, dueMonth: 8 },
      { debtId: 'b', dueYear: 2026, dueMonth: 7 }, // last month's record doesn't count
    ], TODAY);
    expect(gap).toEqual({
      expected: 4,
      logged: 1,
      missed: [{ debtId: 'b', minimumPayment: 100 }],
      missedMinimums: 100,
      notYetDue: 2,
    });
  });

  it('counts any record in the month as logged (same rule as This Month paidDebtIds)', () => {
    const gap = computePaymentGap(DEBTS, [{ debtId: 'b', dueYear: 2026, dueMonth: 8 }], TODAY);
    expect(gap?.logged).toBe(1);
    expect(gap?.missed).toEqual([{ debtId: 'a', minimumPayment: 25 }]); // b's record counts as logged, so only a is missed
  });

  it('treats the due day itself as on time', () => {
    const gap = computePaymentGap([makeDebt({ id: 'x', balance: 100, minimumPayment: 10, dueDate: 12 })], [], TODAY);
    expect(gap?.missed).toEqual([]);
    expect(gap?.notYetDue).toBe(1);
  });

  it('is null when there are no active debts', () => {
    expect(computePaymentGap([DEBTS[4]], [], TODAY)).toBeNull();
  });
});
