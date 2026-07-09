import { describe, it, expect } from 'vitest';
import {
  buildFallbackRecommendations,
  type FallbackInput,
  type FallbackDebt,
} from '@/lib/recommendations/fallback';

function debt(overrides: Partial<FallbackDebt> = {}): FallbackDebt {
  return {
    name: 'Card',
    balance: 5000,
    interestRate: 24,
    minimumPayment: 100,
    category: 'Credit Card',
    creditLimit: 10000,
    ...overrides,
  };
}

function input(overrides: Partial<FallbackInput> = {}): FallbackInput {
  return {
    debts: [debt()],
    expenseItems: [],
    monthlyTakeHome: 4000,
    extraPayment: 0,
    planMonths: 24,
    availableCashFlow: 200,
    ...overrides,
  };
}

const negotiation = (inp: FallbackInput) =>
  buildFallbackRecommendations(inp, 5000, 100, '- No monthly snapshot history yet.').find(
    (r) => r.type === 'negotiation_suggestion',
  )!;

describe('buildFallbackRecommendations — negotiation target', () => {
  it('always emits exactly one negotiation_suggestion', () => {
    const recs = buildFallbackRecommendations(input(), 5000, 100, '');
    expect(recs.filter((r) => r.type === 'negotiation_suggestion')).toHaveLength(1);
  });

  it('targets the highest-APR credit card and points to the scripts panel', () => {
    const rec = negotiation(
      input({ debts: [debt({ name: 'Chase Sapphire', interestRate: 26, balance: 8000 })] }),
    );
    expect(rec.body).toContain('Chase Sapphire');
    expect(rec.body).toContain('26% APR');
    expect(rec.action).toBe('Open the full scripts panel');
    expect(rec.impact).toBe('high'); // 26 >= 20
  });

  it('never names a non-credit-card debt even when it has the highest APR (FINDING-005)', () => {
    const rec = negotiation(
      input({
        debts: [
          debt({ name: 'Payday Loan', category: 'Personal Loan', interestRate: 35, balance: 3000, creditLimit: 0 }),
          debt({ name: 'Citi Double Cash', category: 'Credit Card', interestRate: 22, balance: 6000 }),
        ],
      }),
    );
    // Highest APR overall is the 35% loan, but the panel only handles cards.
    expect(rec.body).toContain('Citi Double Cash');
    expect(rec.body).not.toContain('Payday Loan');
    expect(rec.action).toBe('Open the full scripts panel');
  });

  it('falls back to "track a credit card" copy when no credit card exists', () => {
    const rec = negotiation(
      input({
        debts: [debt({ name: 'Auto Loan', category: 'Auto Loan', interestRate: 9, creditLimit: 0 })],
      }),
    );
    expect(rec.body).toContain('Add a credit card');
    expect(rec.body).not.toContain('Auto Loan');
    expect(rec.action).toBe('Track a credit card to unlock scripts');
    expect(rec.impact).toBe('medium'); // no qualifying card → not high
  });

  it('rates a sub-20% card as medium impact', () => {
    const rec = negotiation(
      input({ debts: [debt({ name: 'Store Card', interestRate: 18 })] }),
    );
    expect(rec.impact).toBe('medium'); // 18 < 20
    expect(rec.body).toContain('Store Card');
  });
});
