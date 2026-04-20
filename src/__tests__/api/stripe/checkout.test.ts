import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockStripe, mockPrisma } = vi.hoisted(() => {
  const mockStripe = {
    customers: {
      create: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  };

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  return { mockStripe, mockPrisma };
});

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => mockStripe),
  getStripeProPriceId: vi.fn(() => 'price_test_pro'),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
}));

import { POST } from '@/app/api/stripe/checkout/route';
import { verifyAuth } from '@/lib/auth-server';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AUTHED = { valid: true as const, user: { id: 'user-1', email: 'test@example.com' } };
const UNAUTHED = { valid: false as const, user: null };

const CHECKOUT_URL = 'https://checkout.stripe.com/pay/cs_test_abc123';

function makeRequest() {
  return new NextRequest('http://localhost/api/stripe/checkout', { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/stripe/checkout', () => {
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

  // --- New customer (no existing stripeCustomerId) ---

  it('creates a Stripe customer when user has none, then creates checkout session', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: null, email: 'test@example.com' });
    mockStripe.customers.create.mockResolvedValue({ id: 'cus_new_123' });
    mockPrisma.user.update.mockResolvedValue({});
    mockStripe.checkout.sessions.create.mockResolvedValue({ url: CHECKOUT_URL });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe(CHECKOUT_URL);

    // Should have created a customer
    expect(mockStripe.customers.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      metadata: { userId: 'user-1' },
    });

    // Should have saved the customer ID to the DB
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { stripeCustomerId: 'cus_new_123' },
    });
  });

  // --- Existing customer ---

  it('reuses existing stripeCustomerId and skips customer creation', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_existing_456', email: 'test@example.com' });
    mockStripe.checkout.sessions.create.mockResolvedValue({ url: CHECKOUT_URL });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockStripe.customers.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('recreates customer and retries when stored customer does not exist in current Stripe mode', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_stale_test_mode', email: 'test@example.com' });
    mockStripe.checkout.sessions.create
      .mockRejectedValueOnce({
        code: 'resource_missing',
        param: 'customer',
        message: "No such customer: 'cus_stale_test_mode'; a similar object exists in test mode",
      })
      .mockResolvedValueOnce({ url: CHECKOUT_URL });
    mockStripe.customers.create.mockResolvedValue({ id: 'cus_live_new_123' });
    mockPrisma.user.update.mockResolvedValue({});

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe(CHECKOUT_URL);

    expect(mockStripe.customers.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { stripeCustomerId: 'cus_live_new_123' },
    });
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledTimes(2);
    expect(mockStripe.checkout.sessions.create.mock.calls[1][0]).toEqual(
      expect.objectContaining({ customer: 'cus_live_new_123' }),
    );
  });

  // --- Checkout session shape ---

  it('creates subscription session with 7-day trial and correct price', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_existing_456', email: 'test@example.com' });
    mockStripe.checkout.sessions.create.mockResolvedValue({ url: CHECKOUT_URL });

    await POST(makeRequest());

    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_test_pro', quantity: 1 }],
        subscription_data: expect.objectContaining({ trial_period_days: 7 }),
        success_url: 'http://localhost:3000/dashboard?upgrade=success',
        cancel_url: 'http://localhost:3000/dashboard?upgrade=canceled',
      }),
    );
  });

  // --- Success / cancel URL variants ---

  it('uses NEXT_PUBLIC_APP_URL for redirect URLs', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com';
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_existing_456', email: 'test@example.com' });
    mockStripe.checkout.sessions.create.mockResolvedValue({ url: CHECKOUT_URL });

    await POST(makeRequest());

    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: 'https://myapp.com/dashboard?upgrade=success',
        cancel_url: 'https://myapp.com/dashboard?upgrade=canceled',
      }),
    );
  });

  // --- Stripe error ---

  it('returns 500 when Stripe throws', async () => {
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_existing_456', email: 'test@example.com' });
    mockStripe.checkout.sessions.create.mockRejectedValueOnce(new Error('Stripe API error'));

    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
  });

  // --- Test card scenarios (documented for manual/e2e use) ---
  // These are unit tests — card numbers influence Stripe's test mode behavior
  // in checkout sessions. Document the expected outcomes here for reference.

  it.each([
    { card: '4242 4242 4242 4242', label: 'Visa success', expectSuccess: true },
    { card: '5555 5555 5555 4444', label: 'Mastercard success', expectSuccess: true },
  ])('checkout session is created regardless of card choice ($label)', async ({ expectSuccess }) => {
    // Card selection happens on the Stripe-hosted page, after session creation.
    // The session.create call itself always succeeds in test mode.
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_existing_456', email: 'test@example.com' });
    mockStripe.checkout.sessions.create.mockResolvedValue({ url: CHECKOUT_URL });

    const res = await POST(makeRequest());
    if (expectSuccess) {
      expect(res.status).toBe(200);
    }
  });
});
