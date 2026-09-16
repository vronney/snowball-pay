import { describe, expect, it } from 'vitest';
import { incomeSavePayload } from '@/lib/dashboard/incomePayload';
import { makeIncome } from './fixtures';

describe('incomeSavePayload (PayoffTab.tsx:113-119, the Plan tab\'s own write)', () => {
  const income = makeIncome({
    monthlyTakeHome: 4_000, essentialExpenses: 2_000, extraPayment: 50, payoffMethod: 'snowball', accelerationAmount: 200,
  });

  it('carries the four saved fields and changes only the method', () => {
    expect(incomeSavePayload(income, { payoffMethod: 'avalanche' })).toEqual({
      monthlyTakeHome: 4_000, essentialExpenses: 2_000, extraPayment: 50, payoffMethod: 'avalanche', accelerationAmount: 200,
    });
  });

  it('changes only the acceleration, and can clear it to null', () => {
    expect(incomeSavePayload(income, { accelerationAmount: 700 })).toMatchObject({ payoffMethod: 'snowball', accelerationAmount: 700 });
    expect(incomeSavePayload(income, { accelerationAmount: null })).toMatchObject({ payoffMethod: 'snowball', accelerationAmount: null });
  });

  it('defaults a missing method to snowball and a missing acceleration to null, as the Plan tab does', () => {
    const bare = makeIncome({ payoffMethod: undefined, accelerationAmount: undefined });
    expect(incomeSavePayload(bare, {})).toMatchObject({ payoffMethod: 'snowball', accelerationAmount: null });
  });
});
