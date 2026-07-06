import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    debt: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    paymentRecord: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    balanceSnapshot: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // The route runs its writes through an interactive transaction — hand the
  // callback the same mock so assertions see the tx calls.
  mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn(mockPrisma)
  );
  return { mockPrisma };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  badRequest: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
  isValidId: vi.fn(() => true),
}));

vi.mock('@/lib/plaid', () => ({
  canUsePlaid: vi.fn(),
}));

import { POST } from '@/app/api/payments/route';
import { verifyAuth } from '@/lib/auth-server';
import { canUsePlaid } from '@/lib/plaid';

const AUTHED = { valid: true as const, user: { id: 'user-1', email: 'test@example.com' } };

const LINKED_DEBT = {
  id: 'debt-1',
  userId: 'user-1',
  balance: 500,
  isLinked: true,
  plaidItemId: 'item-1',
};

const MANUAL_DEBT = {
  id: 'debt-2',
  userId: 'user-1',
  balance: 500,
  isLinked: false,
  plaidItemId: null,
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const PAYMENT_BODY = {
  debtId: 'debt-1',
  amount: 100,
  dueYear: 2026,
  dueMonth: 6,
  mode: 'log',
};

describe('POST /api/payments — bank-linked vs manual balance math', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(mockPrisma)
    );
    mockPrisma.paymentRecord.create.mockResolvedValue({ id: 'rec-1', amount: 100 });
    mockPrisma.debt.update.mockResolvedValue({ ...LINKED_DEBT, balance: 400 });
    mockPrisma.balanceSnapshot.upsert.mockResolvedValue({});
  });

  it('defers balance math to the bank for an eligible linked debt', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    vi.mocked(canUsePlaid).mockResolvedValue(true);
    mockPrisma.debt.findUnique.mockResolvedValue(LINKED_DEBT);

    const res = await POST(makeRequest(PAYMENT_BODY));
    const body = await res.json();

    expect(res.status).toBe(201);
    // Balance untouched — Plaid sync owns it.
    expect(mockPrisma.debt.update).not.toHaveBeenCalled();
    expect(mockPrisma.balanceSnapshot.upsert).not.toHaveBeenCalled();
    expect(body.updatedBalance).toBe(500);
  });

  it('deducts directly when the owner lost Plaid eligibility (Pro → free)', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    vi.mocked(canUsePlaid).mockResolvedValue(false);
    mockPrisma.debt.findUnique.mockResolvedValue(LINKED_DEBT);

    const res = await POST(makeRequest(PAYMENT_BODY));
    const body = await res.json();

    expect(res.status).toBe(201);
    // Sync is paused: the linked debt behaves like a manual one.
    expect(mockPrisma.debt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'debt-1' },
        data: { balance: { decrement: 100 } },
      })
    );
    expect(mockPrisma.balanceSnapshot.upsert).toHaveBeenCalledOnce();
    expect(body.updatedBalance).toBe(400);
  });

  it('deducts for manual debts without ever consulting the Plaid gate', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.debt.findUnique.mockResolvedValue(MANUAL_DEBT);
    mockPrisma.debt.update.mockResolvedValue({ ...MANUAL_DEBT, balance: 400 });

    const res = await POST(makeRequest({ ...PAYMENT_BODY, debtId: 'debt-2' }));

    expect(res.status).toBe(201);
    expect(canUsePlaid).not.toHaveBeenCalled();
    expect(mockPrisma.debt.update).toHaveBeenCalledOnce();
  });
});
