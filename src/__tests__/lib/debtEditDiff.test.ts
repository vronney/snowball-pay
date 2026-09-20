import { describe, it, expect } from 'vitest';
import { changedDebtFields, type DebtEditPayload } from '@/lib/debtEditDiff';
import type { Debt } from '@/types';

const baseline: Debt = {
  id: 'd1',
  userId: 'u1',
  name: 'Discover',
  category: 'Credit Card',
  balance: 10691.17,
  originalBalance: 10691.17,
  interestRate: 26.49,
  minimumPayment: 250,
  creditLimit: 0,
  dueDate: undefined,
  createdAt: new Date('2026-09-19T14:22:16Z'),
  updatedAt: new Date('2026-09-19T14:22:16Z'),
};

// What DebtForm emits when the user saves without touching anything: every
// field re-parsed from the strings it was seeded with.
const untouched: DebtEditPayload = {
  name: 'Discover',
  category: 'Credit Card',
  balance: 10691.17,
  interestRate: 26.49,
  minimumPayment: 250,
  creditLimit: 0,
  dueDate: undefined,
};

describe('changedDebtFields', () => {
  it('returns nothing when the form was saved untouched', () => {
    expect(changedDebtFields(baseline, untouched)).toEqual({});
  });

  it('omits an untouched balance so it cannot revert a payment logged meanwhile', () => {
    // Production pattern: payment deducted server-side seconds earlier, then an
    // edit that only added a due date re-sent the pre-payment balance.
    const result = changedDebtFields(baseline, { ...untouched, dueDate: 15 });
    expect(result).toEqual({ dueDate: 15 });
    expect(result).not.toHaveProperty('balance');
  });

  it('sends the balance when the user actually changed it', () => {
    expect(changedDebtFields(baseline, { ...untouched, balance: 9800 })).toEqual({ balance: 9800 });
  });

  it('sends every field the user changed, and only those', () => {
    const result = changedDebtFields(baseline, {
      ...untouched,
      name: 'Discover It',
      interestRate: 22.99,
      minimumPayment: 275,
    });
    expect(result).toEqual({ name: 'Discover It', interestRate: 22.99, minimumPayment: 275 });
  });

  it('treats a missing credit limit and 0 as the same value', () => {
    const noLimit = { ...baseline, creditLimit: undefined } as unknown as Debt;
    expect(changedDebtFields(noLimit, untouched)).toEqual({});
  });

  it('sends null when the user clears a due date', () => {
    const withDue = { ...baseline, dueDate: 12 };
    expect(changedDebtFields(withDue, { ...untouched, dueDate: undefined })).toEqual({ dueDate: null });
  });

  it('treats a null and an absent due date as unchanged', () => {
    const nullDue = { ...baseline, dueDate: null } as unknown as Debt;
    expect(changedDebtFields(nullDue, untouched)).toEqual({});
  });
});
