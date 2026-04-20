import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
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
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.paidTier).toBe('pro');
    expect(body.subscriptionStatus).toBe('trialing');
    expect(body.subscriptionEndsAt).toBe(trialEnd.toISOString());
    expect(body.isCanceling).toBe(false);
    expect(body.hasCustomer).toBe(true);
  });

  it('marks active subscriptions with an end date as canceling', async () => {
    const cancelAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'pro',
      subscriptionStatus: 'active',
      subscriptionEndsAt: cancelAt,
      stripeCustomerId: 'cus_123',
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
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.paidTier).toBe('free');
    expect(body.subscriptionStatus).toBe('canceled');
    expect(body.isCanceling).toBe(false);
  });
});
