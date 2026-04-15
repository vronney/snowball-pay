import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockStripe, mockPrisma } = vi.hoisted(() => {
  const mockStripe = {
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
  };

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
    },
  };

  return { mockStripe, mockPrisma };
});

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => mockStripe),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  badRequest: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
}));

import { POST } from '@/app/api/stripe/portal/route';
import { verifyAuth } from '@/lib/auth-server';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AUTHED = { valid: true as const, user: { id: 'user-1', email: 'test@example.com' } };
const UNAUTHED = { valid: false as const, user: null };

const PORTAL_URL = 'https://billing.stripe.com/session/test_abc123';

function makeRequest() {
  return new NextRequest('http://localhost/api/stripe/portal', { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/stripe/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  // --- Auth ---

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(UNAUTHED);

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  // --- No billing account ---

  it('returns 400 when user has no stripeCustomerId', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: null });

    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  it('returns 400 when user record is not found', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  // --- Happy path ---

  it('returns portal URL for subscribed user', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_existing_456' });
    mockStripe.billingPortal.sessions.create.mockResolvedValue({ url: PORTAL_URL });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe(PORTAL_URL);
  });

  it('passes correct customer ID and return_url to billing portal', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_existing_456' });
    mockStripe.billingPortal.sessions.create.mockResolvedValue({ url: PORTAL_URL });

    await POST(makeRequest());

    expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_existing_456',
      return_url: 'http://localhost:3000/dashboard?tab=settings',
    });
  });

  it('uses NEXT_PUBLIC_APP_URL for return_url', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com';
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_existing_456' });
    mockStripe.billingPortal.sessions.create.mockResolvedValue({ url: PORTAL_URL });

    await POST(makeRequest());

    expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ return_url: 'https://myapp.com/dashboard?tab=settings' }),
    );
  });

  // --- Stripe error ---

  it('returns 500 when Stripe billing portal throws', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_existing_456' });
    mockStripe.billingPortal.sessions.create.mockRejectedValueOnce(new Error('Stripe API error'));

    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
  });
});
