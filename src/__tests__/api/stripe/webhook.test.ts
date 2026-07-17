import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockStripe, mockPrisma } = vi.hoisted(() => {
  const mockStripe = {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  };

  const mockPrisma = {
    user: {
      update: vi.fn(),
    },
  };

  return { mockStripe, mockPrisma };
});
const mockCaptureServerEvent = vi.hoisted(() => vi.fn());

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => mockStripe),
  getStripeWebhookSecret: vi.fn(() => 'whsec_test_secret'),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/analytics-server', () => ({
  captureServerEvent: mockCaptureServerEvent,
}));
const mockSendCheckoutRecoveryEmail = vi.hoisted(() => vi.fn());
vi.mock('@/lib/checkoutRecovery', () => ({
  sendCheckoutRecoveryEmail: mockSendCheckoutRecoveryEmail,
}));
const mockRemovePlaidItems = vi.hoisted(() => vi.fn());
vi.mock('@/lib/plaidCleanup', () => ({
  removePlaidItemsForCanceledUser: mockRemovePlaidItems,
}));

import { POST } from '@/app/api/webhooks/stripe/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: string, sig = 'valid-sig') {
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': sig },
    body,
  });
}

/** Build a minimal Stripe subscription object */
function makeSub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_test_123',
    status: 'active',
    metadata: { userId: 'user-1' },
    cancel_at: null,
    trial_end: null,
    ...overrides,
  };
}

/** Build a minimal Stripe event */
function makeEvent(type: string, object: Record<string, unknown>) {
  return { id: `evt_${type}`, type, data: { object } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Signature verification ---

  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: '{}',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when signature verification fails', async () => {
    mockStripe.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });

    const res = await POST(makeRequest('{}', 'bad-sig'));
    expect(res.status).toBe(400);
  });

  // --- customer.subscription.created ---

  it('upgrades user to pro on subscription.created with active status', async () => {
    const sub = makeSub({ status: 'active' });
    mockStripe.webhooks.constructEvent.mockReturnValue(makeEvent('customer.subscription.created', sub));
    mockPrisma.user.update.mockResolvedValue({});

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        stripeSubscriptionId: 'sub_test_123',
        paidTier: 'pro',
        subscriptionStatus: 'active',
      }),
    });
  });

  it('upgrades user to pro on subscription.created with trialing status', async () => {
    const trialEnd = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    const sub = makeSub({ status: 'trialing', trial_end: trialEnd });
    mockStripe.webhooks.constructEvent.mockReturnValue(makeEvent('customer.subscription.created', sub));
    mockPrisma.user.update.mockResolvedValue({});

    await POST(makeRequest('{}'));

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        paidTier: 'pro',
        subscriptionStatus: 'trialing',
        subscriptionEndsAt: new Date(trialEnd * 1000),
      }),
    });
  });

  // --- customer.subscription.updated ---

  it('downgrades user to free on subscription.updated with past_due status', async () => {
    const sub = makeSub({ status: 'past_due' });
    mockStripe.webhooks.constructEvent.mockReturnValue(makeEvent('customer.subscription.updated', sub));
    mockPrisma.user.update.mockResolvedValue({});

    await POST(makeRequest('{}'));

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({ paidTier: 'free', subscriptionStatus: 'past_due' }),
    });
  });

  it('sets subscriptionEndsAt from cancel_at when subscription is scheduled for cancellation', async () => {
    const cancelAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const sub = makeSub({ status: 'active', cancel_at: cancelAt });
    mockStripe.webhooks.constructEvent.mockReturnValue(makeEvent('customer.subscription.updated', sub));
    mockPrisma.user.update.mockResolvedValue({});

    await POST(makeRequest('{}'));

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        paidTier: 'pro',
        subscriptionEndsAt: new Date(cancelAt * 1000),
      }),
    });
  });

  it('skips update when subscription has no userId metadata', async () => {
    const sub = makeSub({ metadata: {} });
    mockStripe.webhooks.constructEvent.mockReturnValue(makeEvent('customer.subscription.updated', sub));

    await POST(makeRequest('{}'));

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  // --- customer.subscription.deleted ---

  it('sets paidTier=free and status=canceled on subscription.deleted', async () => {
    const sub = makeSub({ status: 'canceled' });
    mockStripe.webhooks.constructEvent.mockReturnValue(makeEvent('customer.subscription.deleted', sub));
    mockPrisma.user.update.mockResolvedValue({});

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        subscriptionStatus: 'canceled',
        paidTier: 'free',
      }),
    });
  });

  it('revokes the ex-subscriber Plaid items after the downgrade write', async () => {
    const sub = makeSub({ status: 'canceled' });
    mockStripe.webhooks.constructEvent.mockReturnValue(makeEvent('customer.subscription.deleted', sub));
    mockPrisma.user.update.mockResolvedValue({});
    mockRemovePlaidItems.mockResolvedValue({ outcome: 'removed', removed: 1, revokeErrors: 0 });

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    expect(mockRemovePlaidItems).toHaveBeenCalledWith('user-1');
    // Cleanup's isPro check must observe the downgraded tier.
    expect(mockPrisma.user.update.mock.invocationCallOrder[0]).toBeLessThan(
      mockRemovePlaidItems.mock.invocationCallOrder[0],
    );
  });

  // --- checkout.session.completed ---

  it('updates user with customerId, subscriptionId, and pro tier on checkout.session.completed', async () => {
    const activeSub = makeSub({ status: 'active' });
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('checkout.session.completed', {
        mode: 'subscription',
        metadata: {
          userId: 'user-1',
          billing: 'annual',
          analyticsConsent: 'granted',
        },
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
      }),
    );
    mockStripe.subscriptions.retrieve.mockResolvedValue(activeSub);
    mockPrisma.user.update.mockResolvedValue({});

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        stripeCustomerId: 'cus_test_123',
        stripeSubscriptionId: 'sub_test_123',
        paidTier: 'pro',
      }),
    });
    expect(mockCaptureServerEvent).toHaveBeenCalledWith({
      consent: 'granted',
      distinctId: 'user-1',
      event: 'subscription_started',
      insertId: 'evt_checkout.session.completed',
      properties: {
        billing: 'annual',
        source: 'stripe_webhook',
        subscription_status: 'active',
        recovered_checkout: false,
      },
    });
  });

  it('does not send server analytics when checkout consent is denied', async () => {
    const activeSub = makeSub({ status: 'active' });
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('checkout.session.completed', {
        mode: 'subscription',
        metadata: {
          userId: 'user-1',
          billing: 'monthly',
          analyticsConsent: 'denied',
        },
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
      }),
    );
    mockStripe.subscriptions.retrieve.mockResolvedValue(activeSub);
    mockPrisma.user.update.mockResolvedValue({});

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    expect(mockCaptureServerEvent).not.toHaveBeenCalled();
  });

  it('ignores checkout.session.completed for non-subscription modes', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('checkout.session.completed', {
        mode: 'payment',
        metadata: { userId: 'user-1' },
      }),
    );

    await POST(makeRequest('{}'));

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('skips checkout.session.completed when userId metadata is missing', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('checkout.session.completed', {
        mode: 'subscription',
        metadata: {},
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
      }),
    );

    await POST(makeRequest('{}'));

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  // --- checkout.session.expired (abandoned-checkout recovery) ---

  it('sends the recovery email when an expired subscription checkout has a recovery URL', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('checkout.session.expired', {
        mode: 'subscription',
        metadata: { userId: 'user-1' },
        after_expiration: {
          recovery: { url: 'https://checkout.stripe.com/c/pay/recovery_abc123' },
        },
      }),
    );
    mockSendCheckoutRecoveryEmail.mockResolvedValue('sent');

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    expect(mockSendCheckoutRecoveryEmail).toHaveBeenCalledWith({
      userId: 'user-1',
      recoveryUrl: 'https://checkout.stripe.com/c/pay/recovery_abc123',
    });
  });

  it('skips recovery when the expired session has no recovery URL', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('checkout.session.expired', {
        mode: 'subscription',
        metadata: { userId: 'user-1' },
        after_expiration: null,
      }),
    );

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    expect(mockSendCheckoutRecoveryEmail).not.toHaveBeenCalled();
  });

  // --- Unknown event types ---

  it('returns 200 and does nothing for unhandled event types', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('invoice.payment_succeeded', { id: 'in_test_123' }),
    );

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  // --- DB error ---

  it('returns 500 when prisma update throws', async () => {
    const sub = makeSub({ status: 'active' });
    mockStripe.webhooks.constructEvent.mockReturnValue(makeEvent('customer.subscription.created', sub));
    mockPrisma.user.update.mockRejectedValueOnce(new Error('DB error'));

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(500);
  });
});
