import { describe, it, expect } from 'vitest';
import type { Debt as DebtRow, Income as IncomeRow } from '@prisma/client';
import { debtFromRow, incomeFromRow, toDebtCategory } from '@/lib/prismaMappers';

const DEBT_ROW: DebtRow = {
  id: 'd1',
  userId: 'user-1',
  name: 'Citi Simplicity',
  category: 'Credit Card',
  balance: 3029.87,
  originalBalance: 3500.5,
  interestRate: 24.99,
  minimumPayment: 89.12,
  creditLimit: 5000,
  priorityOrder: 2,
  dueDate: 14,
  inPlan: true,
  isLinked: true,
  plaidAccountId: 'acc-1',
  plaidPersistentAccountId: null,
  plaidAccountMask: '6610',
  plaidItemId: 'item-1',
  lastSyncedAt: new Date('2026-09-01T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
};

const INCOME_ROW: IncomeRow = {
  id: 'i1',
  userId: 'user-1',
  monthlyTakeHome: 5200.25,
  essentialExpenses: 2400.75,
  extraPayment: 200,
  payoffMethod: 'avalanche',
  accelerationAmount: null,
  source: 'W2',
  frequency: 'monthly',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
};

describe('toDebtCategory', () => {
  it.each(['Credit Card', 'Student Loan', 'Auto Loan', 'Mortgage', 'Personal Loan', 'Medical Debt', 'Other'] as const)(
    'keeps the known category %s',
    (category) => {
      expect(toDebtCategory(category)).toBe(category);
    },
  );

  it("falls back to 'Other' for a value outside the domain union", () => {
    expect(toDebtCategory('credit card')).toBe('Other');
    expect(toDebtCategory('')).toBe('Other');
  });
});

describe('debtFromRow', () => {
  it('carries every domain field with numbers unchanged', () => {
    expect(debtFromRow(DEBT_ROW)).toEqual({
      id: 'd1',
      userId: 'user-1',
      name: 'Citi Simplicity',
      category: 'Credit Card',
      balance: 3029.87,
      originalBalance: 3500.5,
      interestRate: 24.99,
      minimumPayment: 89.12,
      creditLimit: 5000,
      priorityOrder: 2,
      dueDate: 14,
      inPlan: true,
      isLinked: true,
      plaidAccountId: 'acc-1',
      plaidPersistentAccountId: null,
      plaidItemId: 'item-1',
      lastSyncedAt: new Date('2026-09-01T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    });
  });

  it('drops row-only columns the domain type does not declare', () => {
    expect(debtFromRow(DEBT_ROW)).not.toHaveProperty('plaidAccountMask');
  });

  it('maps a null due day to undefined (every consumer checks it as falsy / == null)', () => {
    expect(debtFromRow({ ...DEBT_ROW, dueDate: null }).dueDate).toBeUndefined();
  });

  it('normalizes an out-of-union category', () => {
    expect(debtFromRow({ ...DEBT_ROW, category: 'Store Card' }).category).toBe('Other');
  });

  it('carries inPlan, so a debt saved outside the plan stays outside', () => {
    expect(debtFromRow({ ...DEBT_ROW, inPlan: false }).inPlan).toBe(false);
  });

  it('does not mutate the row', () => {
    const row = { ...DEBT_ROW, dueDate: null, category: 'Store Card' };
    debtFromRow(row);
    expect(row).toEqual({ ...DEBT_ROW, dueDate: null, category: 'Store Card' });
  });
});

describe('incomeFromRow', () => {
  it('carries every domain field with numbers unchanged', () => {
    expect(incomeFromRow(INCOME_ROW)).toEqual({
      id: 'i1',
      userId: 'user-1',
      monthlyTakeHome: 5200.25,
      essentialExpenses: 2400.75,
      extraPayment: 200,
      payoffMethod: 'avalanche',
      accelerationAmount: null,
      source: 'W2',
      frequency: 'monthly',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    });
  });

  it('maps a null source to undefined', () => {
    expect(incomeFromRow({ ...INCOME_ROW, source: null }).source).toBeUndefined();
  });
});
