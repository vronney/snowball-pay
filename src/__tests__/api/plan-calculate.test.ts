import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

// The route only needs badRequest from auth-server; stub the rest so the
// test never touches Auth0/Prisma.
vi.mock('@/lib/auth-server', () => ({
  badRequest: (msg: string) =>
    new Response(JSON.stringify({ error: msg }), { status: 400 }),
}));

import { POST } from '@/app/api/plan/calculate/route';
import { runCalculation, CalculateSchema } from '@/lib/planCalculate';
import { calculateDebtSnowball } from '@/lib/snowball';

const DEBTS = [
  { id: 'a', name: 'Card', category: 'Credit Card', balance: 14200, interestRate: 24.99, minimumPayment: 285 },
  { id: 'b', name: 'Car', category: 'Auto Loan', balance: 4800, interestRate: 6.9, minimumPayment: 145 },
];

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/plan/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('runCalculation', () => {
  it('treats extraPayment as the acceleration beyond minimums (web parity)', () => {
    const input = CalculateSchema.parse({ debts: DEBTS, extraPayment: 300 });
    const out = runCalculation(input);
    // Web calculator: calc(debts, takeHome, essential, 0, extra - surplus).
    const expected = calculateDebtSnowball(
      out.result.payoffSchedule.length
        ? input.debts.map((d, i) => ({
            id: d.id ?? `debt-${i + 1}`,
            userId: '',
            name: d.name!,
            category: d.category,
            balance: d.balance,
            originalBalance: d.balance,
            interestRate: d.interestRate!,
            minimumPayment: d.minimumPayment!,
            creditLimit: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        : [],
      430 + 300,
      0,
      0,
      0,
    );
    expect(out.result.months).toBe(expected.months);
    expect(out.result.monthlyPayment).toBeCloseTo(730, 6);
    expect(out.totalMinimums).toBe(430);
    expect(out.availableForDebt).toBeNull();
    expect(out.usesEstimates).toBe(false);
  });

  it('uses budget context when income is provided and still means extra = acceleration', () => {
    const input = CalculateSchema.parse({
      debts: DEBTS,
      extraPayment: 300,
      monthlyIncome: 5200,
      essentialExpenses: 2400,
    });
    const out = runCalculation(input);
    expect(out.availableForDebt).toBe(5200 - 2400 - 430);
    expect(out.result.monthlyPayment).toBeCloseTo(730, 6);
  });

  it('fills blank APR and minimum with category estimates and flags it', () => {
    const input = CalculateSchema.parse({
      debts: [{ category: 'Credit Card', balance: 1000 }],
    });
    const out = runCalculation(input);
    expect(out.usesEstimates).toBe(true);
    expect(out.totalMinimums).toBe(25); // max($25, 2% of 1000 = $20)
    expect(out.result.payoffSchedule[0].debtName).toBe('Debt 1');
    expect(out.result.totalInterestPaid).toBeGreaterThan(0);
  });

  it('reports interest and months saved against a minimums-only baseline', () => {
    const out = runCalculation(CalculateSchema.parse({ debts: DEBTS, extraPayment: 500 }));
    expect(out.minimumsOnly.months).toBeGreaterThan(out.result.months);
    expect(out.interestSaved).toBeGreaterThan(0);
    expect(out.monthsSaved).toBe(out.minimumsOnly.months - out.result.months);
  });

  it('orders by APR for avalanche', () => {
    const out = runCalculation(
      CalculateSchema.parse({ debts: DEBTS, extraPayment: 100, method: 'avalanche' }),
    );
    expect(out.result.payoffSchedule[0].debtId).toBe('a');
  });
});

describe('POST /api/plan/calculate', () => {
  it('returns 200 with a payoff result and no auth', async () => {
    const res = await POST(makeRequest({ debts: DEBTS, extraPayment: 200 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.months).toBeGreaterThan(0);
    expect(typeof json.result.debtFreeDate).toBe('string');
  });

  it('400s on an empty debt list', async () => {
    const res = await POST(makeRequest({ debts: [] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Add at least one debt');
  });

  it('400s on a zero balance', async () => {
    const res = await POST(makeRequest({ debts: [{ balance: 0 }] }));
    expect(res.status).toBe(400);
  });

  it('400s on malformed JSON', async () => {
    const res = await POST(makeRequest('{not json'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid JSON body');
  });
});
