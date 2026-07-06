import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getUpcomingPayments, isDebtOverdueThisMonth } from '@/lib/debtHelpers';
import type { Debt } from '@/types';

function makeDebt(overrides: Partial<Debt> & { id: string }): Debt {
  const { id, ...rest } = overrides;

  return {
    id,
    userId: 'user-1',
    name: id,
    category: 'Credit Card',
    balance: 500,
    originalBalance: 500,
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

describe('isDebtOverdueThisMonth', () => {
  const today = new Date(2026, 6, 20); // July 20

  it('is overdue once the due day has passed', () => {
    expect(isDebtOverdueThisMonth(15, today)).toBe(true);
    expect(isDebtOverdueThisMonth(19, today)).toBe(true);
  });

  it('is NOT overdue on the due day itself', () => {
    expect(isDebtOverdueThisMonth(20, today)).toBe(false);
  });

  it('is not overdue before the due day', () => {
    expect(isDebtOverdueThisMonth(21, today)).toBe(false);
    expect(isDebtOverdueThisMonth(31, today)).toBe(false);
  });

  it('is never overdue without a due date', () => {
    expect(isDebtOverdueThisMonth(undefined, today)).toBe(false);
    expect(isDebtOverdueThisMonth(null, today)).toBe(false);
    expect(isDebtOverdueThisMonth(0, today)).toBe(false);
  });
});

describe('getUpcomingPayments', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 20)); // July 20
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports a missed due day this month as overdue (negative daysUntilDue)', () => {
    const [payment] = getUpcomingPayments([makeDebt({ id: 'a', dueDate: 15 })]);
    expect(payment.daysUntilDue).toBe(-5);
    expect(payment.label).toBe('Overdue by 5d');
  });

  it('does not wrap a missed due day to next month', () => {
    // Due the 2nd, viewed on the 20th: must read as 18 days overdue, not
    // "due in N days" for August 2.
    const [payment] = getUpcomingPayments([makeDebt({ id: 'a', dueDate: 2 })]);
    expect(payment.daysUntilDue).toBe(-18);
  });

  it('labels the due day itself as due today', () => {
    const [payment] = getUpcomingPayments([makeDebt({ id: 'a', dueDate: 20 })]);
    expect(payment.daysUntilDue).toBe(0);
    expect(payment.label).toBe('Due today');
  });

  it('labels tomorrow and near-future due days', () => {
    const payments = getUpcomingPayments([
      makeDebt({ id: 'a', dueDate: 21 }),
      makeDebt({ id: 'b', dueDate: 24 }),
    ]);
    expect(payments.map((p) => p.label)).toEqual(['Due tomorrow', 'Due in 4d']);
  });

  it('excludes due days more than 7 days out', () => {
    expect(getUpcomingPayments([makeDebt({ id: 'a', dueDate: 28 })])).toEqual([]);
  });

  it('skips debts without a due date and paid-off debts', () => {
    const payments = getUpcomingPayments([
      makeDebt({ id: 'no-due-date' }),
      makeDebt({ id: 'paid-off', dueDate: 15, balance: 0 }),
    ]);
    expect(payments).toEqual([]);
  });

  it('sorts most-overdue first', () => {
    const payments = getUpcomingPayments([
      makeDebt({ id: 'due-soon', dueDate: 22 }),
      makeDebt({ id: 'very-overdue', dueDate: 5 }),
      makeDebt({ id: 'overdue', dueDate: 18 }),
    ]);
    expect(payments.map((p) => p.debt.id)).toEqual([
      'very-overdue',
      'overdue',
      'due-soon',
    ]);
  });
});
