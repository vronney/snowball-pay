import { describe, expect, it } from 'vitest';
import { planInputFromServer } from '../../../apps/mobile/src/lib/planInput';
import type { Debt, Income } from '../../../apps/mobile/src/lib/types';

const debt = (id: string, balance: number, extra: Partial<Debt> = {}): Debt => ({
  id, userId: 'user-1', name: id, category: 'Credit Card', balance, originalBalance: balance,
  interestRate: 20, minimumPayment: 50, creditLimit: 0,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...extra,
});
const INCOME: Income = {
  id: 'i', userId: 'user-1', monthlyTakeHome: 3_000, essentialExpenses: 1_500, extraPayment: 0,
  payoffMethod: 'snowball', accelerationAmount: null,
};

describe('planInputFromServer (Expo)', () => {
  it('drops debts saved outside the plan, like the web (spec §6.2)', () => {
    const input = planInputFromServer([debt('a', 900), debt('x', 5_000, { inPlan: false, minimumPayment: 200 })], INCOME);
    expect(input?.debts.map((d) => d.id)).toEqual(['a']);
    // Their minimum doesn't shrink the surplus either: 3000 − 1500 − 50.
    expect(input?.extraPayment).toBe(1_450);
  });

  it('keeps debts from a server that sends no inPlan', () => {
    expect(planInputFromServer([debt('a', 900)], INCOME)?.debts).toHaveLength(1);
  });

  it('has no plan when only outside debts are active', () => {
    expect(planInputFromServer([debt('x', 5_000, { inPlan: false })], INCOME)).toBeNull();
  });
});
