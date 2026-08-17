import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
    trialGrant: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/stripe', () => ({
  PLANS: {
    free: { debtLimit: 5 },
    pro: { debtLimit: Infinity, price: 12 },
  },
}));

import { getUserTier, isPro, hasPaidPro } from '@/lib/gates';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

function freeUser(createdAt: Date) {
  return {
    email: 'person@example.com',
    paidTier: 'free',
    subscriptionStatus: 'inactive',
    subscriptionEndsAt: null,
    createdAt,
  };
}

describe('gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.trialGrant.findUnique.mockResolvedValue(null);
    delete process.env.FORCE_PRO;
  });

  it('grants pro during the free signup window, without paid-pro', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(freeUser(daysAgo(2)));

    expect(await getUserTier('user-1')).toBe('pro');
    expect(await isPro('user-1')).toBe(true);
    // Metered features (Plaid) stay closed: no payment method on file.
    expect(await hasPaidPro('user-1')).toBe(false);
  });

  it('reverts to free once the signup window has passed', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(freeUser(daysAgo(15)));

    expect(await getUserTier('user-1')).toBe('free');
    expect(await isPro('user-1')).toBe(false);
  });

  it('treats an active paid subscription as pro regardless of account age', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'pro',
      subscriptionStatus: 'active',
      subscriptionEndsAt: null,
      createdAt: daysAgo(400),
    });

    expect(await getUserTier('user-1')).toBe('pro');
    expect(await hasPaidPro('user-1')).toBe(true);
  });

  it('treats a canceled subscription past its end date as free after the window', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'pro',
      subscriptionStatus: 'canceled',
      subscriptionEndsAt: daysAgo(1),
      createdAt: daysAgo(60),
    });

    expect(await getUserTier('user-1')).toBe('free');
    expect(await hasPaidPro('user-1')).toBe(false);
  });

  it('keeps the signup window open for a user who canceled a paid sub in week one', async () => {
    // Subscribed and canceled within the first day — the account's free week
    // still covers Pro features, but not metered (paid-only) ones.
    mockPrisma.user.findUnique.mockResolvedValue({
      paidTier: 'free',
      subscriptionStatus: 'canceled',
      subscriptionEndsAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      createdAt: daysAgo(1),
    });

    expect(await getUserTier('user-1')).toBe('pro');
    expect(await hasPaidPro('user-1')).toBe(false);
  });


  it('anchors the window to the trial grant, so delete+recreate cannot reset it', async () => {
    // The account row looks brand new (deleted and re-provisioned yesterday),
    // but the durable TrialGrant shows this email consumed its window long ago.
    mockPrisma.user.findUnique.mockResolvedValue(freeUser(daysAgo(1)));
    mockPrisma.trialGrant.findUnique.mockResolvedValue({ grantedAt: daysAgo(40) });

    expect(await getUserTier('user-1')).toBe('free');
    expect(await isPro('user-1')).toBe(false);
  });

  it('gives no window to accounts that predate the feature launch', async () => {
    // Created before SIGNUP_TRIAL_LAUNCH: never promised a free week, so they
    // neither get one nor see "your free week ended" messaging.
    mockPrisma.user.findUnique.mockResolvedValue(freeUser(new Date('2026-08-10T00:00:00Z')));

    expect(await getUserTier('user-1')).toBe('free');
    expect(await isPro('user-1')).toBe(false);
  });

  it('defaults to free when no user row exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    expect(await getUserTier('user-1')).toBe('free');
    expect(await hasPaidPro('user-1')).toBe(false);
  });
});
