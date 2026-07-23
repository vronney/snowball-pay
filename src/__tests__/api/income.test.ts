import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
    },
    income: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  };
  return { mockPrisma };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
}));

import { POST } from '@/app/api/income/route';
import { verifyAuth } from '@/lib/auth-server';

const AUTHED = { valid: true as const, user: { id: 'user-1', email: 'test@example.com' } };
const UNAUTHED = { valid: false as const, user: null };

const BASE_BODY = {
  monthlyTakeHome: 4000,
  essentialExpenses: 1800,
  extraPayment: 0,
};

const EXISTING_INCOME = {
  id: 'income-1',
  userId: 'user-1',
  monthlyTakeHome: 4000,
  essentialExpenses: 1800,
  extraPayment: 0,
  payoffMethod: 'snowball',
  accelerationAmount: null,
  source: null,
  frequency: 'monthly',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(body: Record<string, unknown> = BASE_BODY) {
  return new NextRequest('http://localhost/api/income', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/income', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(UNAUTHED);

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
  });

  it('allows free users to save budget fields without a what-if amount', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.income.findUnique.mockResolvedValue(EXISTING_INCOME);
    mockPrisma.income.update.mockResolvedValue({ ...EXISTING_INCOME, ...BASE_BODY });

    const res = await POST(makeRequest(BASE_BODY));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('income');
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.income.update).toHaveBeenCalledOnce();
  });

  it('blocks free users from saving a numeric what-if amount', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'free',
      subscriptionStatus: 'inactive',
      subscriptionEndsAt: null,
    });

    const res = await POST(makeRequest({ ...BASE_BODY, accelerationAmount: 250 }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual(
      expect.objectContaining({
        error: 'upgrade_required',
        feature: 'What-if slider',
      }),
    );
    expect(mockPrisma.income.update).not.toHaveBeenCalled();
    expect(mockPrisma.income.create).not.toHaveBeenCalled();
  });

  it('allows pro users to save a numeric what-if amount', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'pro',
      subscriptionStatus: 'active',
      subscriptionEndsAt: null,
    });
    mockPrisma.income.findUnique.mockResolvedValue(EXISTING_INCOME);
    mockPrisma.income.update.mockResolvedValue({
      ...EXISTING_INCOME,
      accelerationAmount: 250,
    });

    const res = await POST(makeRequest({ ...BASE_BODY, accelerationAmount: 250 }));

    expect(res.status).toBe(200);
    expect(mockPrisma.income.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accelerationAmount: 250 }),
      }),
    );
  });

  it('preserves the saved payoff method when the payload omits it', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.income.findUnique.mockResolvedValue({
      ...EXISTING_INCOME,
      payoffMethod: 'avalanche',
    });
    mockPrisma.income.update.mockResolvedValue({
      ...EXISTING_INCOME,
      payoffMethod: 'avalanche',
    });

    const res = await POST(makeRequest(BASE_BODY));

    expect(res.status).toBe(200);
    const updateArg = mockPrisma.income.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect('payoffMethod' in updateArg.data).toBe(false);
  });

  it('blocks free users from switching into custom priority order', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.income.findUnique.mockResolvedValue(EXISTING_INCOME);
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'free',
      subscriptionStatus: 'inactive',
      subscriptionEndsAt: null,
    });

    const res = await POST(makeRequest({ ...BASE_BODY, payoffMethod: 'custom' }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual(
      expect.objectContaining({
        error: 'upgrade_required',
        feature: 'Custom priority order',
      }),
    );
    expect(mockPrisma.income.update).not.toHaveBeenCalled();
  });

  it('lets a free user already on custom keep saving it (downgrade grandfather)', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.income.findUnique.mockResolvedValue({
      ...EXISTING_INCOME,
      payoffMethod: 'custom',
    });
    mockPrisma.income.update.mockResolvedValue({
      ...EXISTING_INCOME,
      payoffMethod: 'custom',
    });

    const res = await POST(makeRequest({ ...BASE_BODY, payoffMethod: 'custom' }));

    expect(res.status).toBe(200);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.income.update).toHaveBeenCalledOnce();
  });

  it('allows pro users to switch into custom priority order', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.income.findUnique.mockResolvedValue(EXISTING_INCOME);
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'pro',
      subscriptionStatus: 'active',
      subscriptionEndsAt: null,
    });
    mockPrisma.income.update.mockResolvedValue({
      ...EXISTING_INCOME,
      payoffMethod: 'custom',
    });

    const res = await POST(makeRequest({ ...BASE_BODY, payoffMethod: 'custom' }));

    expect(res.status).toBe(200);
    expect(mockPrisma.income.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ payoffMethod: 'custom' }),
      }),
    );
  });
});
