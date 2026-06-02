import { describe, expect, it } from 'vitest';
import { selectMonthlyFocusDebt } from '@/lib/monthlyFocusDebt';
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
