import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

const { mockPrisma, tx } = vi.hoisted(() => {
  const tx = {
    trialGrant: { create: vi.fn() },
    userPreferences: { upsert: vi.fn() },
    debt: { updateMany: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      debt: { findMany: vi.fn() },
      income: { findUnique: vi.fn() },
      expense: { findMany: vi.fn() },
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
  tooManyRequests: vi.fn(() => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })),
}));
vi.mock('@/lib/gates', () => ({ resolveBillingVerdict: vi.fn(), isSelfServeTrialEligible: vi.fn() }));
vi.mock('@/lib/rateLimit', () => ({ limits: { trialStart: vi.fn() } }));
vi.mock('@/lib/trialGrantKey', () => ({ trialGrantKey: vi.fn((email: string) => `hash:${email}`) }));
vi.mock('@/lib/analytics-server', () => ({ captureServerEvent: vi.fn(async () => undefined) }));

import { POST } from '@/app/api/trial/start/route';
import { verifyAuth } from '@/lib/auth-server';
import { isSelfServeTrialEligible, resolveBillingVerdict } from '@/lib/gates';
import { limits } from '@/lib/rateLimit';
import { captureServerEvent } from '@/lib/analytics-server';
import { calculatePlanMetrics } from '@/lib/payoffPlan';
import { debtFromRow, incomeFromRow } from '@/lib/prismaMappers';

const NOW = new Date(2026, 8, 17, 12, 0);
const ENDS = new Date(NOW.getTime() + 14 * 24 * 60 * 60 * 1000);
const AUTHED = { valid: true as const, user: { id: 'user-1', email: 'owner@example.com' } };
const FREE_VERDICT = { paidPro: false, proEligible: false, signupTrialEndsAt: null };
const TRIAL_VERDICT = { paidPro: false, proEligible: true, signupTrialEndsAt: ENDS };

const DEBT_ROWS = [
  { id: 'b', userId: 'user-1', name: 'Card B', category: 'Credit Card', balance: 3000, originalBalance: 3000, interestRate: 25, minimumPayment: 60, creditLimit: 0, priorityOrder: null, dueDate: 10, inPlan: true, createdAt: new Date('2026-02-01'), updatedAt: new Date('2026-02-01') },
  { id: 'a', userId: 'user-1', name: 'Card A', category: 'Credit Card', balance: 800, originalBalance: 1000, interestRate: 5, minimumPayment: 30, creditLimit: 0, priorityOrder: null, dueDate: 5, inPlan: true, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') },
  { id: 'x', userId: 'user-1', name: 'Store card', category: 'Credit Card', balance: 1200, originalBalance: 1200, interestRate: 22, minimumPayment: 35, creditLimit: 0, priorityOrder: null, dueDate: 12, inPlan: false, createdAt: new Date('2026-03-01'), updatedAt: new Date('2026-03-01') },
];
const INCOME_ROW = { id: 'i', userId: 'user-1', monthlyTakeHome: 3000, essentialExpenses: 2000, extraPayment: 0, payoffMethod: 'snowball', accelerationAmount: 100, frequency: 'monthly', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') };

function req(body?: unknown, { consent = true, raw }: { consent?: boolean; raw?: string } = {}) {
  return new NextRequest('http://localhost/api/trial/start', {
    method: 'POST',
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    headers: consent ? { cookie: 'sp_analytics_consent_v1=granted' } : {},
  });
}

describe('POST /api/trial/start (spec §6.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    process.env.DASHBOARD_V2_USERS = 'owner@example.com';
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    vi.mocked(limits.trialStart).mockResolvedValue(true);
    // Reset, not just clear: a test that stops early leaves queued once-values behind.
    vi.mocked(resolveBillingVerdict).mockReset().mockResolvedValueOnce(FREE_VERDICT).mockResolvedValueOnce(TRIAL_VERDICT);
    vi.mocked(isSelfServeTrialEligible).mockResolvedValue(true);
    mockPrisma.debt.findMany.mockResolvedValue(DEBT_ROWS);
    mockPrisma.income.findUnique.mockResolvedValue(INCOME_ROW);
    mockPrisma.expense.findMany.mockResolvedValue([{ amount: 50 }]);
    tx.trialGrant.create.mockResolvedValue({});
    tx.userPreferences.upsert.mockResolvedValue({});
    tx.debt.updateMany.mockResolvedValue({ count: 1 });
  });
  afterEach(() => {
    vi.useRealTimers();
    delete process.env.DASHBOARD_V2_USERS;
  });

  it('rejects unauthenticated requests', async () => {
    vi.mocked(verifyAuth).mockResolvedValue({ valid: false, user: null });
    expect((await POST(req({}))).status).toBe(401);
  });

  it('is not available to accounts outside the dashboard v2 rollout (spec §5.3)', async () => {
    process.env.DASHBOARD_V2_USERS = 'someone-else@example.com';
    const res = await POST(req({}));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'not_available' });
    expect(limits.trialStart).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('rate limits per user', async () => {
    vi.mocked(limits.trialStart).mockResolvedValue(false);
    expect((await POST(req({}))).status).toBe(429);
    expect(limits.trialStart).toHaveBeenCalledWith('user-1');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a malformed body', async () => {
    expect((await POST(req(undefined, { raw: 'not json' }))).status).toBe(400);
    expect((await POST(req({ today: 5 }))).status).toBe(400);
    expect((await POST(req({ today: '2026-09-17', extra: true }))).status).toBe(400);
  });

  it('refuses an account that is not eligible, writing nothing', async () => {
    vi.mocked(isSelfServeTrialEligible).mockResolvedValue(false);
    const res = await POST(req({ today: '2026-09-17' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'trial_used' });
    expect(isSelfServeTrialEligible).toHaveBeenCalledWith('owner@example.com', FREE_VERDICT);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('starts the trial in one transaction: grant, start and baseline, every debt counted', async () => {
    const res = await POST(req({ today: '2026-09-17' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ proEligible: true, paidPro: false, signupTrialEndsAt: ENDS.toISOString() });

    // The route's own mapping; the literals carry only the columns the mappers read.
    const debts = DEBT_ROWS.map((row) => debtFromRow(row as unknown as Parameters<typeof debtFromRow>[0]));
    const income = incomeFromRow(INCOME_ROW as unknown as Parameters<typeof incomeFromRow>[0]);
    const planStartDate = new Date(2026, 8, 17);
    const counted = calculatePlanMetrics(debts.map((d) => ({ ...d, inPlan: true })), income, [{ amount: 50 }], { planStartDate })!;
    const inPlanOnly = calculatePlanMetrics(debts, income, [{ amount: 50 }], { planStartDate })!;
    // The trial counts the outside debt, so the baseline is the plan WITH it.
    expect(counted.result.totalInterestPaid).not.toBe(inPlanOnly.result.totalInterestPaid);

    const baseline = {
      trialBaselineAt: new Date(Date.UTC(2026, 8, 17)),
      trialBaselineMonths: counted.result.months,
      trialBaselineInterest: counted.result.totalInterestPaid,
    };
    expect(tx.trialGrant.create).toHaveBeenCalledWith({ data: { emailHash: 'hash:owner@example.com', grantedAt: NOW } });
    expect(tx.userPreferences.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', trialStartedAt: NOW, ...baseline },
      update: { trialStartedAt: NOW, ...baseline },
    });
    expect(tx.debt.updateMany).toHaveBeenCalledWith({ where: { userId: 'user-1', inPlan: false }, data: { inPlan: true } });
    // The grant is the atomic once-per-email guard, so it is written first.
    expect(tx.trialGrant.create.mock.invocationCallOrder[0]).toBeLessThan(tx.userPreferences.upsert.mock.invocationCallOrder[0]);
    expect(captureServerEvent).toHaveBeenCalledWith({
      consent: 'granted',
      distinctId: 'user-1',
      event: 'trial_self_serve_started',
      insertId: 'trial_self_serve_started:user-1',
      properties: { source: 'dashboard_v2' },
    });
  });

  it('writes no baseline when there is no plan to measure, and captures nothing without consent', async () => {
    mockPrisma.income.findUnique.mockResolvedValue(null);
    const res = await POST(req({}, { consent: false }));
    expect(res.status).toBe(200);
    expect(tx.userPreferences.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', trialStartedAt: NOW },
      update: { trialStartedAt: NOW },
    });
    expect(captureServerEvent).toHaveBeenCalledWith(expect.objectContaining({ consent: 'denied' }));
  });

  it('answers 409 when a concurrent start already created the grant', async () => {
    tx.trialGrant.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`emailHash`)', { code: 'P2002', clientVersion: 'test' }),
    );
    const res = await POST(req({}));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'trial_used' });
    expect(tx.userPreferences.upsert).not.toHaveBeenCalled();
    expect(captureServerEvent).not.toHaveBeenCalled();
  });

  it('returns 500 without leaking details when the database fails', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    tx.userPreferences.upsert.mockRejectedValue(new Error('db down'));
    const res = await POST(req({}));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to start trial' });
    quiet.mockRestore();
  });

  it('still answers 200 with the started trial when the verdict re-read fails', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(resolveBillingVerdict).mockReset().mockResolvedValueOnce(FREE_VERDICT).mockRejectedValueOnce(new Error('db down'));
    const res = await POST(req({ today: '2026-09-17' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      proEligible: true,
      paidPro: false,
      signupTrialEndsAt: new Date(NOW.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    quiet.mockRestore();
  });
});
