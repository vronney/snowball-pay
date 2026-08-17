import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
    },
    trialGrant: {
      findUnique: vi.fn(),
    },
  };
  return { mockPrisma };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => ({ subscriptions: { retrieve: vi.fn() } })),
  PLANS: {
    free: { debtLimit: 5 },
    pro: { debtLimit: Infinity, price: 12 },
  },
}));

vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
}));

import { GET } from '@/app/api/user/subscription/route';
import { verifyAuth } from '@/lib/auth-server';

const AUTHED = { valid: true as const, user: { id: 'user-1', email: 'test@example.com' } };
const UNAUTHED = { valid: false as const, user: null };

function makeRequest() {
  return new NextRequest('http://localhost/api/user/subscription', { method: 'GET' });
}

describe('GET /api/user/subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.trialGrant.findUnique.mockResolvedValue(null);
    delete process.env.PLAID_ALLOWED_EMAILS;
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(UNAUTHED);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
  });

  it('does not mark trialing subscriptions as canceling just because trial has an end date', async () => {
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'pro',
      subscriptionStatus: 'trialing',
      subscriptionEndsAt: trialEnd,
      stripeCustomerId: 'cus_123',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.paidTier).toBe('pro');
    expect(body.subscriptionStatus).toBe('trialing');
    expect(body.subscriptionEndsAt).toBe(trialEnd.toISOString());
    expect(body.isCanceling).toBe(false);
    expect(body.hasCustomer).toBe(true);
    expect(body.monthlyPrice).toBe(12);
    expect(body.annualAvailable).toBeUndefined();
  });

  it('marks active subscriptions with an end date as canceling', async () => {
    const cancelAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'pro',
      subscriptionStatus: 'active',
      subscriptionEndsAt: cancelAt,
      stripeCustomerId: 'cus_123',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isCanceling).toBe(true);
  });

  it('treats past end date as expired and not canceling', async () => {
    const pastEnd = new Date(Date.now() - 24 * 60 * 60 * 1000);
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'pro',
      subscriptionStatus: 'active',
      subscriptionEndsAt: pastEnd,
      stripeCustomerId: 'cus_123',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.paidTier).toBe('free');
    expect(body.subscriptionStatus).toBe('canceled');
    expect(body.isCanceling).toBe(false);
  });

  it('expires a trialing subscription whose trial_end is past the 2-hour grace period', async () => {
    // Simulate: trial ended 3 days ago but webhook never updated the DB row
    const expiredTrialEnd = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'pro',
      subscriptionStatus: 'trialing',
      subscriptionEndsAt: expiredTrialEnd,
      stripeCustomerId: 'cus_123',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.paidTier).toBe('free');
    expect(body.subscriptionStatus).toBe('canceled');
    expect(body.isCanceling).toBe(false);
  });

  it('keeps a trialing subscription active if trial_end is within the 2-hour grace period', async () => {
    // Simulate: trial ended 30 minutes ago — grace period not yet elapsed
    const recentTrialEnd = new Date(Date.now() - 30 * 60 * 1000);
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'pro',
      subscriptionStatus: 'trialing',
      subscriptionEndsAt: recentTrialEnd,
      stripeCustomerId: 'cus_123',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.paidTier).toBe('pro');
    expect(body.subscriptionStatus).toBe('trialing');
  });

  it('grants the free signup window to a new free user', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({
      email: 'test@example.com',
      paidTier: 'free',
      subscriptionStatus: 'inactive',
      subscriptionEndsAt: null,
      stripeCustomerId: null,
      createdAt,
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.paidTier).toBe('free');
    expect(body.signupTrialActive).toBe(true);
    expect(body.signupTrialEndsAt).toBe(
      new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    );
    // Pro features open during the window…
    expect(body.proEligible).toBe(true);
    // …but Plaid stays paid-only (each linked account costs real money).
    expect(body.plaidEligible).toBe(false);
  });

  it('ends the free signup window after 14 days', async () => {
    const createdAt = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'free',
      subscriptionStatus: 'inactive',
      subscriptionEndsAt: null,
      stripeCustomerId: null,
      createdAt,
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.signupTrialActive).toBe(false);
    expect(body.proEligible).toBe(false);
    expect(body.plaidEligible).toBe(false);
  });

  it('does not flag the signup window for paying subscribers', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'pro',
      subscriptionStatus: 'active',
      subscriptionEndsAt: null,
      stripeCustomerId: 'cus_123',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.paidTier).toBe('pro');
    expect(body.signupTrialActive).toBe(false);
    expect(body.plaidEligible).toBe(true);
  });

  it('anchors the window to the trial grant at the API boundary', async () => {
    // Fresh row (deleted + re-provisioned yesterday) but a durable grant from
    // 40 days ago: the API must report the trial as consumed, not restarted.
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({
      email: 'test@example.com',
      paidTier: 'free',
      subscriptionStatus: 'inactive',
      subscriptionEndsAt: null,
      stripeCustomerId: null,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });
    mockPrisma.trialGrant.findUnique.mockResolvedValue({
      grantedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.signupTrialActive).toBe(false);
    expect(body.proEligible).toBe(false);
  });
});
