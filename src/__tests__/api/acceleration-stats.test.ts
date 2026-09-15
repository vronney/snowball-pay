import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    debt: { findMany: vi.fn() },
    income: { findUnique: vi.fn() },
    expense: { findMany: vi.fn() },
    paymentRecord: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
}));

import { GET } from '@/app/api/acceleration-stats/route';
import { verifyAuth } from '@/lib/auth-server';

const row = (id: string, balance: number, minimumPayment: number, interestRate: number, inPlan = true) => ({
  id, userId: 'user-1', name: id, category: 'Credit Card', balance, originalBalance: balance, interestRate,
  minimumPayment, creditLimit: 0, priorityOrder: null, dueDate: null, inPlan,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
});
const COUNTED = [row('a', 2_000, 60, 22), row('b', 6_000, 150, 9)];
const OUTSIDE = row('x', 9_000, 250, 27, false);

describe('GET /api/acceleration-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0));
    vi.mocked(verifyAuth).mockResolvedValue({ valid: true as const, user: { id: 'user-1', email: 'owner@example.com' } });
    // Null acceleration = the full surplus, so an outside minimum would shrink the planned extra.
    mockPrisma.income.findUnique.mockResolvedValue({
      id: 'i', userId: 'user-1', monthlyTakeHome: 3_500, essentialExpenses: 1_800, extraPayment: 0,
      payoffMethod: 'snowball', accelerationAmount: null, frequency: 'monthly',
      createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    });
    mockPrisma.expense.findMany.mockResolvedValue([{ amount: 100 }]);
    mockPrisma.paymentRecord.findMany.mockResolvedValue([{ debtId: 'a', amount: 400, dueYear: 2026, dueMonth: 8 }]);
  });
  afterEach(() => vi.useRealTimers());

  async function statsFor(debts: ReturnType<typeof row>[]) {
    mockPrisma.debt.findMany.mockResolvedValue(debts);
    const res = await GET(new NextRequest('http://localhost/api/acceleration-stats'));
    expect(res.status).toBe(200);
    return res.json();
  }

  it('measures only the plan: a debt saved outside it changes nothing (spec §6.2)', async () => {
    const counted = await statsFor(COUNTED);
    expect(counted.plannedMonthly).toBe(1_390);
    expect(await statsFor([...COUNTED, OUTSIDE])).toEqual(counted);
  });

  it('excludes a payment record on the outside debt from actualExtra (spec §6.2, CodeRabbit C2)', async () => {
    const withoutOutsidePayment = await statsFor(COUNTED);
    mockPrisma.paymentRecord.findMany.mockResolvedValue([
      { debtId: 'a', amount: 400, dueYear: 2026, dueMonth: 8 },
      { debtId: 'x', amount: 500, dueYear: 2026, dueMonth: 8 },
    ]);
    const withOutsidePayment = await statsFor([...COUNTED, OUTSIDE]);
    expect(withOutsidePayment).toEqual(withoutOutsidePayment);
  });

  it('returns the zero-stat response when every debt is outside the plan (CodeRabbit C2)', async () => {
    // Same shape as the existing `!income || debts.length === 0` branch —
    // compare against that branch's actual output instead of hand-computing
    // monthRanges (offsets, ordering) a second time in the test.
    mockPrisma.debt.findMany.mockResolvedValue([]);
    const res = await GET(new NextRequest('http://localhost/api/acceleration-stats'));
    const noDebtsZeroStat = await res.json();

    expect(await statsFor([OUTSIDE])).toEqual(noDebtsZeroStat);
  });

  it('does NOT return the zero-stat response merely because every debt is paid off', async () => {
    const paidOff = row('paid', 0, 100, 20);
    const res = await statsFor([paidOff]);
    expect(res.plannedMonthly).toBeGreaterThan(0);
    expect(res.currentDebtFreeDate).not.toBeNull();
  });
});
