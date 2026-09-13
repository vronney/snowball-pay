import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    debt: { findMany: vi.fn() },
    income: { findUnique: vi.fn() },
    expense: { findMany: vi.fn() },
    paymentRecord: { findMany: vi.fn(), findFirst: vi.fn() },
    balanceSnapshot: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
  tooManyRequests: vi.fn(() => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })),
}));
vi.mock('@/lib/gates', () => ({ resolveBillingVerdict: vi.fn() }));
vi.mock('@/lib/rateLimit', () => ({ limits: { dashboardInsights: vi.fn() } }));

import { GET } from '@/app/api/dashboard/insights/route';
import { verifyAuth, tooManyRequests } from '@/lib/auth-server';
import { resolveBillingVerdict } from '@/lib/gates';
import { limits } from '@/lib/rateLimit';

const AUTHED = { valid: true as const, user: { id: 'user-1', email: 'owner@example.com' } };
const req = (qs = '') => new NextRequest(`http://localhost/api/dashboard/insights${qs}`);

const DEBT_ROWS = [
  { id: 'b', userId: 'user-1', name: 'Card B', category: 'Credit Card', balance: 3000, originalBalance: 3000, interestRate: 25, minimumPayment: 60, creditLimit: 0, priorityOrder: null, dueDate: 10, createdAt: new Date('2026-02-01'), updatedAt: new Date('2026-02-01') },
  { id: 'a', userId: 'user-1', name: 'Card A', category: 'Credit Card', balance: 800, originalBalance: 1000, interestRate: 5, minimumPayment: 30, creditLimit: 0, priorityOrder: null, dueDate: 5, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') },
];

describe('GET /api/dashboard/insights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 12, 12, 0));
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    vi.mocked(limits.dashboardInsights).mockResolvedValue(true);
    vi.mocked(resolveBillingVerdict).mockResolvedValue({ paidPro: false, proEligible: false, signupTrialEndsAt: null });
    mockPrisma.debt.findMany.mockResolvedValue(DEBT_ROWS);
    mockPrisma.income.findUnique.mockResolvedValue({ id: 'i', userId: 'user-1', monthlyTakeHome: 3000, essentialExpenses: 2000, extraPayment: 0, payoffMethod: 'snowball', accelerationAmount: 100, frequency: 'monthly', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') });
    mockPrisma.expense.findMany.mockResolvedValue([{ amount: 50 }]);
    mockPrisma.paymentRecord.findMany.mockResolvedValue([{ debtId: 'a', dueYear: 2026, dueMonth: 8 }]);
    mockPrisma.paymentRecord.findFirst.mockResolvedValue({ id: 'p1' });
    mockPrisma.balanceSnapshot.findMany.mockResolvedValue([{ debtId: 'a', balance: 800, recordedAt: new Date('2026-09-01T00:00:00Z') }]);
  });
  afterEach(() => vi.useRealTimers());

  it('rejects unauthenticated requests', async () => {
    vi.mocked(verifyAuth).mockResolvedValue({ valid: false, user: null });
    expect((await GET(req())).status).toBe(401);
  });

  it('rate limits per user', async () => {
    vi.mocked(limits.dashboardInsights).mockResolvedValue(false);
    expect((await GET(req())).status).toBe(429);
    expect(limits.dashboardInsights).toHaveBeenCalledWith('user-1');
    expect(tooManyRequests).toHaveBeenCalledWith();
  });

  it('builds insights from the user\'s own rows, uncached', async () => {
    const res = await GET(req('?today=2026-09-12'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    const body = await res.json();
    expect(body.asOf).toEqual({ year: 2026, month: 8, day: 12 });
    expect(body.paymentGap).toMatchObject({ expected: 2, logged: 1, missed: [{ debtId: 'b', minimumPayment: 60 }] });
    expect(body.coachMoves[0]).toMatchObject({ id: 'log_missed', isFree: true });
    expect(body.tier).toEqual({ proEligible: false, paidPro: false, trial: { active: false, endsAt: null } });

    // Same debt order as GET /api/debts, so engine tie-breaks match the app.
    expect(mockPrisma.debt.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1' }, orderBy: { createdAt: 'desc' } });
    expect(mockPrisma.paymentRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', dueYear: 2026, dueMonth: 8 },
    }));
    expect(mockPrisma.balanceSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', debt: { userId: 'user-1' } },
    }));
  });

  it('ignores a client date more than a day off', async () => {
    await GET(req('?today=2020-01-01'));
    expect(mockPrisma.paymentRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', dueYear: 2026, dueMonth: 8 },
    }));
  });

  it('reports an active signup trial', async () => {
    vi.mocked(resolveBillingVerdict).mockResolvedValue({ paidPro: false, proEligible: true, signupTrialEndsAt: new Date(2026, 8, 20) });
    const body = await (await GET(req())).json();
    expect(body.tier.trial).toEqual({ active: true, endsAt: new Date(2026, 8, 20).toISOString() });
    expect(body.coachMoves.every((m: { isFree: boolean }) => m.isFree)).toBe(true);
  });

  it('returns 500 without leaking details when the database fails', async () => {
    mockPrisma.debt.findMany.mockRejectedValue(new Error('db down'));
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to load dashboard insights' });
  });

  it('returns 500 (not a bypass) when the rate limiter itself fails (CodeRabbit)', async () => {
    vi.mocked(limits.dashboardInsights).mockRejectedValue(new Error('redis down'));
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to load dashboard insights' });
  });
});
