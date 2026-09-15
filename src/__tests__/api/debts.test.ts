import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { debt: { count: vi.fn(), create: vi.fn() } },
}));

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
    (feature: string) => new Response(JSON.stringify({ error: 'upgrade_required', feature }), { status: 403 }),
  ),
}));

import { POST } from '@/app/api/debts/route';
import { verifyAuth } from '@/lib/auth-server';
import { getUserTier } from '@/lib/gates';

const AUTHED = { valid: true as const, user: { id: 'user-1', email: 'owner@example.com' } };
const BODY = { name: 'Store card', category: 'Credit Card', balance: 1200, interestRate: 24.99, minimumPayment: 40 };

const post = (body: Record<string, unknown>) =>
  POST(new NextRequest('http://localhost/api/debts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
const createdData = () => mockPrisma.debt.create.mock.calls[0][0].data;

describe('POST /api/debts — the Free cap (spec §6.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DASHBOARD_V2_USERS', 'owner@example.com');
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    vi.mocked(getUserTier).mockResolvedValue('free');
    mockPrisma.debt.count.mockResolvedValue(5);
    mockPrisma.debt.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'debt-9', ...data }));
  });
  afterEach(() => vi.unstubAllEnvs());

  it('counts only in-plan debts toward the cap', async () => {
    mockPrisma.debt.count.mockResolvedValue(4);
    await post(BODY);
    expect(mockPrisma.debt.count).toHaveBeenCalledWith({ where: { userId: 'user-1', inPlan: true } });
  });

  it('saves below the cap in the plan, with the same payload and response as before', async () => {
    mockPrisma.debt.count.mockResolvedValue(4);
    const res = await post(BODY);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ debt: expect.objectContaining({ id: 'debt-9', name: 'Store card' }) });
    expect(createdData()).not.toHaveProperty('inPlan');
  });

  it('keeps the 403 at the cap when the client does not opt in', async () => {
    const res = await post(BODY);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'upgrade_required', feature: 'Unlimited debts' });
    expect(mockPrisma.debt.create).not.toHaveBeenCalled();
  });

  it('saves outside the plan at the cap when dashboard v2 opts in', async () => {
    const res = await post({ ...BODY, allowOutsidePlan: true });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      debt: expect.objectContaining({ id: 'debt-9', inPlan: false }),
      outsidePlan: true,
    });
    expect(createdData()).toMatchObject({ inPlan: false, balance: 1200, originalBalance: 1200 });
  });

  it('refuses the opt-in from an account not on dashboard v2', async () => {
    vi.stubEnv('DASHBOARD_V2_USERS', 'someone-else@example.com');
    const res = await post({ ...BODY, allowOutsidePlan: true });
    expect(res.status).toBe(403);
    expect(mockPrisma.debt.create).not.toHaveBeenCalled();
  });

  it('saves in the plan below the cap even when the client opts in', async () => {
    mockPrisma.debt.count.mockResolvedValue(3);
    const res = await post({ ...BODY, allowOutsidePlan: true });
    expect(await res.json()).not.toHaveProperty('outsidePlan');
    expect(createdData()).not.toHaveProperty('inPlan');
  });

  it('never caps Pro, and never saves a Pro debt outside the plan', async () => {
    vi.mocked(getUserTier).mockResolvedValue('pro');
    const res = await post({ ...BODY, allowOutsidePlan: true });
    expect(res.status).toBe(201);
    expect(mockPrisma.debt.count).not.toHaveBeenCalled();
    expect(createdData()).not.toHaveProperty('inPlan');
  });

  it('rejects a non-boolean opt-in', async () => {
    expect((await post({ ...BODY, allowOutsidePlan: 'yes' })).status).toBe(400);
  });
});
