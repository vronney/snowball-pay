import { describe, expect, it } from 'vitest';
import { isPlanDebt, selectMonthlyFocusDebt } from '@/lib/monthlyFocusDebt';
import type { Debt } from '@/types';
import type { DebtPayoffSchedule } from '@/lib/snowball';

function makeDebt(overrides: Partial<Debt> & { id: string; balance: number }): Debt {
  const { id, balance, ...rest } = overrides;

  return {
    id,
    userId: 'user-1',
    name: id,
    category: 'Credit Card',
    balance,
    originalBalance: balance,
    interestRate: 0,
    minimumPayment: 50,
    creditLimit: 0,
    priorityOrder: null,
    dueDate: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...rest,
  };
}

function payoffSchedule(...debtIds: string[]): DebtPayoffSchedule[] {
  return debtIds.map((debtId, index) => ({
    debtId,
    debtName: debtId,
    category: 'Credit Card',
    originalBalance: 500,
    monthPaidOff: index + 1,
    interestPaid: 0,
    orderInPayoff: index + 1,
  }));
}

describe('selectMonthlyFocusDebt', () => {
  it('skips a paid-off debt even when the payoff schedule ranks it first', () => {
    const focusDebt = selectMonthlyFocusDebt(
      [
        makeDebt({ id: 'paid-off-card', balance: 0 }),
        makeDebt({ id: 'next-card', balance: 300 }),
      ],
      { payoffSchedule: payoffSchedule('paid-off-card', 'next-card') },
    );

    expect(focusDebt?.id).toBe('next-card');
  });

  it('advances to the next active debt when this month already has a payment for the focus debt', () => {
    const focusDebt = selectMonthlyFocusDebt(
      [
        makeDebt({ id: 'focus-card', balance: 300 }),
        makeDebt({ id: 'next-card', balance: 500 }),
      ],
      { payoffSchedule: payoffSchedule('focus-card', 'next-card') },
      new Set(['focus-card']),
    );

    expect(focusDebt?.id).toBe('next-card');
  });

  it('returns no focus debt when every active debt has been paid this month', () => {
    const focusDebt = selectMonthlyFocusDebt(
      [
        makeDebt({ id: 'focus-card', balance: 300 }),
        makeDebt({ id: 'next-card', balance: 500 }),
      ],
      { payoffSchedule: payoffSchedule('focus-card', 'next-card') },
      new Set(['focus-card', 'next-card']),
    );

    expect(focusDebt).toBeNull();
  });
});

describe('isPlanDebt (spec §6.2)', () => {
  it('counts active debts with no inPlan value and with inPlan: true', () => {
    expect(isPlanDebt(makeDebt({ id: 'a', balance: 300 }))).toBe(true);
    expect(isPlanDebt(makeDebt({ id: 'a', balance: 300, inPlan: true }))).toBe(true);
  });

  it('excludes a debt saved outside the plan, and a paid-off one', () => {
    expect(isPlanDebt(makeDebt({ id: 'a', balance: 300, inPlan: false }))).toBe(false);
    expect(isPlanDebt(makeDebt({ id: 'a', balance: 0 }))).toBe(false);
  });
});

describe('selectMonthlyFocusDebt and debts outside the plan', () => {
  it('never picks a debt saved outside the plan', () => {
    const focusDebt = selectMonthlyFocusDebt(
      [makeDebt({ id: 'outside', balance: 100, inPlan: false }), makeDebt({ id: 'counted', balance: 900 })],
      { payoffSchedule: payoffSchedule('counted') },
    );
    expect(focusDebt?.id).toBe('counted');
  });

  it('skips it in the no-schedule fallback too', () => {
    const focusDebt = selectMonthlyFocusDebt(
      [makeDebt({ id: 'outside', balance: 100, inPlan: false }), makeDebt({ id: 'counted', balance: 900 })],
      null,
    );
    expect(focusDebt?.id).toBe('counted');
  });
});
