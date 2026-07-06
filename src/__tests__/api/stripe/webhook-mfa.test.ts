import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockStripe, mockPrisma, mockSetMfaRequired } = vi.hoisted(() => {
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

  const mockSetMfaRequired = vi.fn();

  return { mockStripe, mockPrisma, mockSetMfaRequired };
});

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => mockStripe),
  getStripeWebhookSecret: vi.fn(() => 'whsec_test_secret'),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth0-management', () => ({
  setMfaRequired: mockSetMfaRequired,
}));

import { POST } from '@/app/api/webhooks/stripe/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body = '{}', sig = 'valid-sig') {
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': sig },
    body,
  });
}

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

function makeEvent(type: string, object: Record<string, unknown>) {
  return { type, data: { object } };
}

const UPDATED_USER = { id: 'user-1', auth0Id: 'auth0|abc123' };

// ---------------------------------------------------------------------------
// Tests — MFA enforcement on Pro subscriptions (INFOSEC: MFA before Plaid)
// ---------------------------------------------------------------------------

describe('POST /api/webhooks/stripe — MFA trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.update.mockResolvedValue(UPDATED_USER);
    mockSetMfaRequired.mockResolvedValue(undefined);
  });

  it('flags MFA on the Auth0 account when subscription lands on pro', async () => {
    const sub = makeSub({ status: 'active' });
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('customer.subscription.created', sub),
    );

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockSetMfaRequired).toHaveBeenCalledWith('auth0|abc123');
  });

  it('does not flag MFA when subscription resolves to free tier', async () => {
    const sub = makeSub({ status: 'past_due' });
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('customer.subscription.updated', sub),
    );

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockSetMfaRequired).not.toHaveBeenCalled();
  });

  it('still returns 200 when setMfaRequired throws (Auth0 hiccup must not 500 billing sync)', async () => {
    const sub = makeSub({ status: 'active' });
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('customer.subscription.created', sub),
    );
    mockSetMfaRequired.mockRejectedValueOnce(new Error('Auth0 down'));

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    // The tier update itself must have landed despite the Auth0 failure
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    );
  });

  it('flags MFA on checkout.session.completed for an active pro subscription', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('checkout.session.completed', {
        mode: 'subscription',
        metadata: { userId: 'user-1' },
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
      }),
    );
    mockStripe.subscriptions.retrieve.mockResolvedValue(makeSub({ status: 'active' }));

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockSetMfaRequired).toHaveBeenCalledWith('auth0|abc123');
  });
});
