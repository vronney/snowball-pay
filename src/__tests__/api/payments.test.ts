import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma, mockCanUsePlaid } = vi.hoisted(() => {
  const mockPrisma = {
    debt: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    paymentRecord: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    balanceSnapshot: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { mockPrisma, mockCanUsePlaid: vi.fn() };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  badRequest: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
  isValidId: vi.fn(() => true),
}));

// Mirror the real isDebtBalanceBankManaged (linked && canUsePlaid) on top of
// the mocked gate so the routes exercise the same branching the app does.
vi.mock('@/lib/plaid', () => ({
  canUsePlaid: mockCanUsePlaid,
  isDebtBalanceBankManaged: vi.fn(
    async (
      debt: { isLinked?: boolean | null; plaidItemId?: string | null; userId: string } | null,
      email: string | null | undefined
    ) => {
      if (!debt || !(debt.isLinked && debt.plaidItemId)) return false;
      return mockCanUsePlaid(debt.userId, email);
    }
  ),
}));

import { POST } from '@/app/api/payments/route';
import { DELETE, PATCH } from '@/app/api/payments/[id]/route';
import { verifyAuth } from '@/lib/auth-server';

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

const RECORD = {
  id: 'rec-1',
  userId: 'user-1',
  debtId: 'debt-1',
  amount: 100,
  dueYear: 2026,
  dueMonth: 6,
};

function postRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function idRequest(method: 'DELETE' | 'PATCH', body?: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/payments/rec-1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const PARAMS = { params: { id: 'rec-1' } };

const PAYMENT_BODY = {
  debtId: 'debt-1',
  amount: 100,
  dueYear: 2026,
  dueMonth: 6,
  mode: 'log',
};

beforeEach(() => {
  vi.clearAllMocks();
  // The routes use both transaction forms: interactive (callback gets tx) and
  // batched (array of already-started promises).
  mockPrisma.$transaction.mockImplementation(async (arg: unknown) =>
    Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(mockPrisma)
  );
  mockPrisma.paymentRecord.create.mockResolvedValue({ id: 'rec-1', amount: 100 });
  mockPrisma.paymentRecord.update.mockResolvedValue({ id: 'rec-1', amount: 150 });
  mockPrisma.paymentRecord.delete.mockResolvedValue({});
  mockPrisma.debt.update.mockResolvedValue({ ...LINKED_DEBT, balance: 400 });
  mockPrisma.balanceSnapshot.upsert.mockResolvedValue({});
  mockPrisma.balanceSnapshot.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.balanceSnapshot.findUnique.mockResolvedValue(null);
  vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
});

describe('POST /api/payments — bank-linked vs manual balance math', () => {
  it('defers balance math to the bank for an eligible linked debt', async () => {
    mockCanUsePlaid.mockResolvedValue(true);
    mockPrisma.debt.findUnique.mockResolvedValue(LINKED_DEBT);

    const res = await POST(postRequest(PAYMENT_BODY));
    const body = await res.json();

    expect(res.status).toBe(201);
    // Balance untouched — Plaid sync owns it.
    expect(mockPrisma.debt.update).not.toHaveBeenCalled();
    expect(mockPrisma.balanceSnapshot.upsert).not.toHaveBeenCalled();
    expect(body.updatedBalance).toBe(500);
  });

  it('deducts directly when the owner lost Plaid eligibility (Pro → free)', async () => {
    mockCanUsePlaid.mockResolvedValue(false);
    mockPrisma.debt.findUnique.mockResolvedValue(LINKED_DEBT);

    const res = await POST(postRequest(PAYMENT_BODY));
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
    mockPrisma.debt.findUnique.mockResolvedValue(MANUAL_DEBT);
    mockPrisma.debt.update.mockResolvedValue({ ...MANUAL_DEBT, balance: 400 });

    const res = await POST(postRequest({ ...PAYMENT_BODY, debtId: 'debt-2' }));

    expect(res.status).toBe(201);
    expect(mockCanUsePlaid).not.toHaveBeenCalled();
    expect(mockPrisma.debt.update).toHaveBeenCalledOnce();
  });
});

describe('DELETE /api/payments/[id] — same rule as logging', () => {
  it('only removes the record for an eligible linked debt', async () => {
    mockCanUsePlaid.mockResolvedValue(true);
    mockPrisma.paymentRecord.findUnique.mockResolvedValue(RECORD);
    mockPrisma.debt.findUnique.mockResolvedValue(LINKED_DEBT);

    const res = await DELETE(idRequest('DELETE'), PARAMS);

    expect(res.status).toBe(200);
    expect(mockPrisma.paymentRecord.delete).toHaveBeenCalledOnce();
    expect(mockPrisma.debt.update).not.toHaveBeenCalled();
  });

  it('restores the balance when the owner lost Plaid eligibility', async () => {
    mockCanUsePlaid.mockResolvedValue(false);
    mockPrisma.paymentRecord.findUnique.mockResolvedValue(RECORD);
    mockPrisma.debt.findUnique.mockResolvedValue(LINKED_DEBT);

    const res = await DELETE(idRequest('DELETE'), PARAMS);

    expect(res.status).toBe(200);
    expect(mockPrisma.paymentRecord.delete).toHaveBeenCalledOnce();
    expect(mockPrisma.debt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'debt-1' },
        data: { balance: { increment: 100 } },
      })
    );
    expect(mockPrisma.balanceSnapshot.updateMany).toHaveBeenCalledOnce();
  });
});

describe('PATCH /api/payments/[id] — same rule as logging', () => {
  it('only updates the record for an eligible linked debt', async () => {
    mockCanUsePlaid.mockResolvedValue(true);
    mockPrisma.paymentRecord.findUnique.mockResolvedValue(RECORD);
    mockPrisma.debt.findUnique.mockResolvedValue(LINKED_DEBT);

    const res = await PATCH(idRequest('PATCH', { amount: 150 }), PARAMS);

    expect(res.status).toBe(200);
    expect(mockPrisma.paymentRecord.update).toHaveBeenCalledOnce();
    expect(mockPrisma.debt.update).not.toHaveBeenCalled();
  });

  it('applies the amount delta when the owner lost Plaid eligibility', async () => {
    mockCanUsePlaid.mockResolvedValue(false);
    mockPrisma.paymentRecord.findUnique.mockResolvedValue(RECORD);
    mockPrisma.debt.findUnique.mockResolvedValue(LINKED_DEBT);

    const res = await PATCH(idRequest('PATCH', { amount: 150 }), PARAMS);

    expect(res.status).toBe(200);
    // 150 new − 100 old = 50 more paid → balance decrements by the delta.
    expect(mockPrisma.debt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'debt-1' },
        data: { balance: { decrement: 50 } },
      })
    );
  });
});
