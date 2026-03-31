import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — use vi.hoisted so variables are available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockTx, mockPrisma } = vi.hoisted(() => {
  const mockTx = {
    payoffPlan: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    payoffStep: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  };

  const mockPrisma = {
    debt: { findMany: vi.fn() },
    income: { findUnique: vi.fn() },
    expense: { findMany: vi.fn() },
    $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
  };

  return { mockTx, mockPrisma };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  badRequest: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
}));

import { POST } from '@/app/api/plan/calculate/route';
import { verifyAuth } from '@/lib/auth-server';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AUTHED = { valid: true as const, user: { id: 'user-cuid-1', email: 'test@example.com' } };
const UNAUTHED = { valid: false as const, user: null };

const DEBT = {
  id: 'debt-cuid-1',
  userId: 'user-cuid-1',
  name: 'Visa',
  category: 'Credit Card',
  balance: 1000,
  originalBalance: 1000,
  interestRate: 15,
  minimumPayment: 50,
  creditLimit: 2000,
  priorityOrder: null,
  dueDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const INCOME = {
  id: 'income-cuid-1',
  userId: 'user-cuid-1',
  monthlyTakeHome: 4000,
  essentialExpenses: 2000,
  extraPayment: 100,
  accelerationAmount: null,
  payoffMethod: 'snowball',
  source: null,
  frequency: 'monthly',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const PLAN_ROW = {
  id: 'plan-cuid-1',
  userId: 'user-cuid-1',
  debtFreeDate: new Date(),
  totalInterestPaid: 0,
  totalAmountPaid: 0,
  monthlyPayment: 0,
  payoffSteps: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(body: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/plan/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/plan/calculate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore $transaction default implementation after clearAllMocks resets it
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
    );
  });

  // --- Auth ---

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(UNAUTHED);

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  // --- Input validation ---

  it('returns 400 for an invalid payoff method', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.debt.findMany.mockResolvedValue([DEBT]);
    mockPrisma.income.findUnique.mockResolvedValue(INCOME);
    mockPrisma.expense.findMany.mockResolvedValue([]);

    const res = await POST(makeRequest({ method: 'invalid-method' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when no income exists', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.debt.findMany.mockResolvedValue([DEBT]);
    mockPrisma.income.findUnique.mockResolvedValue(null);
    mockPrisma.expense.findMany.mockResolvedValue([]);

    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  it('returns 400 when no debts exist', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.debt.findMany.mockResolvedValue([]);
    mockPrisma.income.findUnique.mockResolvedValue(INCOME);
    mockPrisma.expense.findMany.mockResolvedValue([]);

    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  // --- Happy path: new plan (create) ---

  it('creates a new plan when none exists', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.debt.findMany.mockResolvedValue([DEBT]);
    mockPrisma.income.findUnique.mockResolvedValue(INCOME);
    mockPrisma.expense.findMany.mockResolvedValue([]);
    mockTx.payoffPlan.findUnique.mockResolvedValue(null);
    mockTx.payoffPlan.create.mockResolvedValue(PLAN_ROW);
    mockTx.payoffStep.create.mockResolvedValue({});

    const res = await POST(makeRequest({ method: 'snowball' }));
    expect(res.status).toBe(200);

    expect(mockTx.payoffPlan.create).toHaveBeenCalledOnce();
    expect(mockTx.payoffPlan.update).not.toHaveBeenCalled();
    expect(mockTx.payoffStep.deleteMany).not.toHaveBeenCalled();
    expect(mockTx.payoffStep.create).toHaveBeenCalled();
  });

  it('response body includes payoffPlan with a schedule array', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.debt.findMany.mockResolvedValue([DEBT]);
    mockPrisma.income.findUnique.mockResolvedValue(INCOME);
    mockPrisma.expense.findMany.mockResolvedValue([]);
    mockTx.payoffPlan.findUnique.mockResolvedValue(null);
    mockTx.payoffPlan.create.mockResolvedValue(PLAN_ROW);
    mockTx.payoffStep.create.mockResolvedValue({});

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(body).toHaveProperty('payoffPlan');
    expect(Array.isArray(body.payoffPlan.schedule)).toBe(true);
    expect(body.payoffPlan.schedule).toHaveLength(1); // one debt
  });

  // --- Happy path: existing plan (update) ---

  it('updates an existing plan and replaces steps atomically', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.debt.findMany.mockResolvedValue([DEBT]);
    mockPrisma.income.findUnique.mockResolvedValue(INCOME);
    mockPrisma.expense.findMany.mockResolvedValue([]);
    mockTx.payoffPlan.findUnique.mockResolvedValue(PLAN_ROW);
    mockTx.payoffPlan.update.mockResolvedValue(PLAN_ROW);
    mockTx.payoffStep.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.payoffStep.create.mockResolvedValue({});

    const res = await POST(makeRequest({ method: 'snowball' }));
    expect(res.status).toBe(200);

    expect(mockTx.payoffPlan.update).toHaveBeenCalledOnce();
    expect(mockTx.payoffPlan.create).not.toHaveBeenCalled();
    // Old steps deleted before new ones created
    expect(mockTx.payoffStep.deleteMany).toHaveBeenCalledWith({
      where: { payoffPlanId: PLAN_ROW.id },
    });
    expect(mockTx.payoffStep.create).toHaveBeenCalled();
  });

  // --- Transaction integrity ---

  it('wraps plan upsert and step writes in a single $transaction', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.debt.findMany.mockResolvedValue([DEBT]);
    mockPrisma.income.findUnique.mockResolvedValue(INCOME);
    mockPrisma.expense.findMany.mockResolvedValue([]);
    mockTx.payoffPlan.findUnique.mockResolvedValue(null);
    mockTx.payoffPlan.create.mockResolvedValue(PLAN_ROW);
    mockTx.payoffStep.create.mockResolvedValue({});

    await POST(makeRequest());

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it('returns 500 when $transaction throws', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.debt.findMany.mockResolvedValue([DEBT]);
    mockPrisma.income.findUnique.mockResolvedValue(INCOME);
    mockPrisma.expense.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockRejectedValueOnce(new Error('DB error'));

    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
  });

  // --- Method variants ---

  it('accepts avalanche method', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.debt.findMany.mockResolvedValue([DEBT]);
    mockPrisma.income.findUnique.mockResolvedValue({ ...INCOME, payoffMethod: 'avalanche' });
    mockPrisma.expense.findMany.mockResolvedValue([]);
    mockTx.payoffPlan.findUnique.mockResolvedValue(null);
    mockTx.payoffPlan.create.mockResolvedValue(PLAN_ROW);
    mockTx.payoffStep.create.mockResolvedValue({});

    const res = await POST(makeRequest({ method: 'avalanche' }));
    expect(res.status).toBe(200);
  });

  it('accepts custom method', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.debt.findMany.mockResolvedValue([{ ...DEBT, priorityOrder: 1 }]);
    mockPrisma.income.findUnique.mockResolvedValue({ ...INCOME, payoffMethod: 'custom' });
    mockPrisma.expense.findMany.mockResolvedValue([]);
    mockTx.payoffPlan.findUnique.mockResolvedValue(null);
    mockTx.payoffPlan.create.mockResolvedValue(PLAN_ROW);
    mockTx.payoffStep.create.mockResolvedValue({});

    const res = await POST(makeRequest({ method: 'custom' }));
    expect(res.status).toBe(200);
  });

  // --- Recurring expenses included ---

  it('includes recurring expenses in calculation', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.debt.findMany.mockResolvedValue([DEBT]);
    mockPrisma.income.findUnique.mockResolvedValue(INCOME);
    mockPrisma.expense.findMany.mockResolvedValue([
      { id: 'e1', amount: 200, userId: 'user-cuid-1' },
      { id: 'e2', amount: 150, userId: 'user-cuid-1' },
    ]);
    mockTx.payoffPlan.findUnique.mockResolvedValue(null);
    mockTx.payoffPlan.create.mockResolvedValue(PLAN_ROW);
    mockTx.payoffStep.create.mockResolvedValue({});

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockTx.payoffStep.create).toHaveBeenCalled();
  });
});
