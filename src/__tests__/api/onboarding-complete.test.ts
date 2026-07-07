import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    debt: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    income: {
      upsert: vi.fn(),
    },
    calculatorLead: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { mockPrisma };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  badRequest: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
}));

vi.mock('@/lib/gates', () => ({
  FREE_DEBT_LIMIT: 5,
  getUserTier: vi.fn(),
  upgradeRequired: vi.fn(
    (feature: string) =>
      new Response(JSON.stringify({ error: 'upgrade_required', feature }), { status: 403 })
  ),
}));

import { POST } from '@/app/api/onboarding/complete/route';
import { verifyAuth } from '@/lib/auth-server';
import { getUserTier } from '@/lib/gates';

const AUTHED = { valid: true as const, user: { id: 'user-1', email: 'test@example.com' } };
const UNAUTHED = { valid: false as const, user: null };

const INCOME = {
  monthlyTakeHome: 5200,
  essentialExpenses: 2400,
  extraPayment: 200,
  payoffMethod: 'snowball' as const,
};

function debt(name: string, balance: number) {
  return {
    name,
    category: 'Credit Card' as const,
    balance,
    interestRate: 19.99,
    minimumPayment: 50,
    creditLimit: 0,
  };
}

function makeRequest(body: Record<string, unknown>, idempotencyKey?: string) {
  return new NextRequest('http://localhost/api/onboarding/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/onboarding/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    vi.mocked(getUserTier).mockResolvedValue('free');
    mockPrisma.debt.count.mockResolvedValue(0);
    mockPrisma.debt.findFirst.mockResolvedValue(null);
    mockPrisma.income.upsert.mockResolvedValue({ id: 'income-1' });
    mockPrisma.calculatorLead.updateMany.mockResolvedValue({ count: 0 });
    let debtSeq = 0;
    mockPrisma.debt.create.mockImplementation(async ({ data }: { data: { name: string } }) => ({
      id: `debt-${++debtSeq}`,
      ...data,
    }));
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
    );
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(UNAUTHED);

    const res = await POST(makeRequest({ income: INCOME, debts: [debt('Visa', 1000)] }));

    expect(res.status).toBe(401);
  });

  it('rejects a payload with neither firstDebt nor debts', async () => {
    const res = await POST(makeRequest({ income: INCOME }));

    expect(res.status).toBe(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('still accepts the legacy single firstDebt shape', async () => {
    const res = await POST(makeRequest({ income: INCOME, firstDebt: debt('Visa', 1000) }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.debt.create).toHaveBeenCalledTimes(1);
    expect(body.debtId).toBe('debt-1');
    expect(body.debtIds).toEqual(['debt-1']);
    expect(body.skippedDebts).toBe(0);
  });

  it('creates every debt from a multi-debt calculator session', async () => {
    const res = await POST(
      makeRequest({
        income: INCOME,
        debts: [debt('Visa', 14200), debt('Car Loan', 4800), debt('Student Loan', 22500)],
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.debt.create).toHaveBeenCalledTimes(3);
    expect(body.debtIds).toHaveLength(3);
    expect(body.debtId).toBe('debt-1');
    expect(body.skippedDebts).toBe(0);
    // originalBalance must mirror balance at creation time
    expect(mockPrisma.debt.create.mock.calls[0][0].data.originalBalance).toBe(14200);
  });

  it('caps free-tier debt creation at remaining capacity instead of failing', async () => {
    mockPrisma.debt.count.mockResolvedValue(3); // 2 slots left of 5

    const res = await POST(
      makeRequest({
        income: INCOME,
        debts: [debt('A', 100), debt('B', 200), debt('C', 300), debt('D', 400)],
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.debt.create).toHaveBeenCalledTimes(2);
    expect(body.debtIds).toHaveLength(2);
    expect(body.skippedDebts).toBe(2);
  });

  it('returns upgrade_required when a free user is already at the debt limit', async () => {
    mockPrisma.debt.count.mockResolvedValue(5);

    const res = await POST(makeRequest({ income: INCOME, debts: [debt('Visa', 1000)] }));

    expect(res.status).toBe(403);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not cap debt creation for pro users', async () => {
    vi.mocked(getUserTier).mockResolvedValue('pro');
    mockPrisma.debt.count.mockResolvedValue(0);

    const debts = Array.from({ length: 8 }, (_, i) => debt(`Debt ${i + 1}`, 100 * (i + 1)));
    const res = await POST(makeRequest({ income: INCOME, debts }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.debt.create).toHaveBeenCalledTimes(8);
    expect(body.skippedDebts).toBe(0);
    // Pro path never needs the count query
    expect(mockPrisma.debt.count).not.toHaveBeenCalled();
  });

  it('clears the lead plan snapshot after a successful completion', async () => {
    const res = await POST(makeRequest({ income: INCOME, debts: [debt('Visa', 1000)] }));

    expect(res.status).toBe(200);
    expect(mockPrisma.calculatorLead.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'test@example.com' } })
    );
  });

  it('still succeeds when the snapshot cleanup fails', async () => {
    mockPrisma.calculatorLead.updateMany.mockRejectedValue(new Error('DB down'));

    const res = await POST(makeRequest({ income: INCOME, debts: [debt('Visa', 1000)] }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.debtIds).toHaveLength(1);
  });

  it('keeps two identical debts in one submit distinct (dedupe excludes same-request rows)', async () => {
    // Two genuinely identical debts in a single payload must both be created
    // even with an idempotency key — the replay guard may only match rows
    // that existed before this request.
    const res = await POST(
      makeRequest(
        { income: INCOME, debts: [debt('Chase Visa', 1000), debt('Chase Visa', 1000)] },
        'same-request-key'
      )
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.debt.create).toHaveBeenCalledTimes(2);
    expect(body.debtIds).toEqual(['debt-1', 'debt-2']);
    // The second dedupe lookup must exclude the row created moments earlier.
    expect(mockPrisma.debt.findFirst.mock.calls[1][0].where.id).toEqual({
      notIn: ['debt-1'],
    });
    // And be bounded to the idempotency window so an unrelated old debt with
    // identical values is never mistaken for a replay.
    expect(mockPrisma.debt.findFirst.mock.calls[1][0].where.createdAt.gte).toBeInstanceOf(Date);
  });

  it('skips re-creating matching debts on an idempotent replay', async () => {
    mockPrisma.debt.findFirst.mockResolvedValue({ id: 'debt-existing' });

    const res = await POST(
      makeRequest({ income: INCOME, debts: [debt('Visa', 1000)] }, 'replay-key-1')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.debt.create).not.toHaveBeenCalled();
    expect(body.debtIds).toEqual(['debt-existing']);
    expect(body.dedupedDebt).toBe(true);
  });
});
