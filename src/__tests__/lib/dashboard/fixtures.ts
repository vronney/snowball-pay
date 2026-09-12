import type { BalanceSnapshot, Debt, Income } from '@/types';

export function makeDebt(
  overrides: Partial<Debt> & { id: string; balance: number; minimumPayment: number },
): Debt {
  const { id, balance, minimumPayment, ...rest } = overrides;
  return {
    id,
    userId: 'user-1',
    name: id,
    category: 'Credit Card',
    balance,
    originalBalance: balance,
    interestRate: 0,
    minimumPayment,
    creditLimit: 0,
    priorityOrder: null,
    dueDate: undefined,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...rest,
  };
}

export function makeIncome(overrides: Partial<Income> = {}): Income {
  return {
    id: 'income-1',
    userId: 'user-1',
    monthlyTakeHome: 4_000,
    essentialExpenses: 2_000,
    extraPayment: 0,
    payoffMethod: 'snowball',
    accelerationAmount: null,
    source: undefined,
    frequency: 'monthly',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

/** ym = "YYYY-MM"; recordedAt normalized to the 1st, as the API stores it. */
export function makeSnapshot(debtId: string, ym: string, balance: number): BalanceSnapshot {
  const iso = `${ym}-01T00:00:00.000Z`;
  return { id: `${debtId}-${ym}`, debtId, userId: 'user-1', balance, recordedAt: iso, createdAt: iso };
}
