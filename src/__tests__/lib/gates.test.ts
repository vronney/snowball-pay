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

import { getUserTier, isPro, hasPaidPro, resolveBillingVerdict, isSelfServeTrialEligible } from '@/lib/gates';
import { SIGNUP_TRIAL_DAYS } from '@/lib/billing';

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
      email: 'person@example.com',
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
      email: 'person@example.com',
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
      email: 'person@example.com',
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

describe('the pre-launch grant rule (spec §6.4)', () => {
  const PRE_LAUNCH = new Date('2026-08-10T00:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.trialGrant.findUnique.mockResolvedValue(null);
    delete process.env.FORCE_PRO;
  });

  it('gives a pre-launch account the window of a grant it started itself', async () => {
    const grantedAt = daysAgo(2);
    mockPrisma.user.findUnique.mockResolvedValue(freeUser(PRE_LAUNCH));
    mockPrisma.trialGrant.findUnique.mockResolvedValue({ grantedAt });

    expect(await resolveBillingVerdict('user-1')).toEqual({
      paidPro: false,
      proEligible: true,
      signupTrialEndsAt: new Date(grantedAt.getTime() + SIGNUP_TRIAL_DAYS * DAY_MS),
    });
  });

  it('keeps a pre-launch account on Free when its only grant predates the launch (a deletion tombstone)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(freeUser(PRE_LAUNCH));
    mockPrisma.trialGrant.findUnique.mockResolvedValue({ grantedAt: PRE_LAUNCH });

    expect(await resolveBillingVerdict('user-1')).toEqual({ paidPro: false, proEligible: false, signupTrialEndsAt: null });
  });

  it('never falls back to createdAt for a pre-launch account when the grant lookup fails', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPrisma.user.findUnique.mockResolvedValue(freeUser(PRE_LAUNCH));
    mockPrisma.trialGrant.findUnique.mockRejectedValue(new Error('db down'));

    expect(await resolveBillingVerdict('user-1')).toEqual({ paidPro: false, proEligible: false, signupTrialEndsAt: null });
    quiet.mockRestore();
  });

  it('still falls back to createdAt for a post-launch account when the grant lookup fails (unchanged)', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const createdAt = daysAgo(2);
    mockPrisma.user.findUnique.mockResolvedValue(freeUser(createdAt));
    mockPrisma.trialGrant.findUnique.mockRejectedValue(new Error('db down'));

    expect(await resolveBillingVerdict('user-1')).toEqual({
      paidPro: false,
      proEligible: true,
      signupTrialEndsAt: new Date(createdAt.getTime() + SIGNUP_TRIAL_DAYS * DAY_MS),
    });
    quiet.mockRestore();
  });
});

describe('isSelfServeTrialEligible (spec §6.4; plan decision 1)', () => {
  const NEVER_TRIALED = { paidPro: false, proEligible: false, signupTrialEndsAt: null };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.trialGrant.findUnique.mockResolvedValue(null);
    delete process.env.FORCE_PRO;
  });

  it('is true for a Free account that never had a window and whose email has no grant', async () => {
    expect(await isSelfServeTrialEligible('person@example.com', NEVER_TRIALED)).toBe(true);
    expect(mockPrisma.trialGrant.findUnique).toHaveBeenCalledWith({
      where: { emailHash: expect.any(String) },
      select: { grantedAt: true },
    });
  });

  it('is false for Pro, for any account that already had a window, and without an email', async () => {
    expect(await isSelfServeTrialEligible('person@example.com', { paidPro: true, proEligible: true, signupTrialEndsAt: null })).toBe(false);
    expect(await isSelfServeTrialEligible('person@example.com', { paidPro: false, proEligible: false, signupTrialEndsAt: daysAgo(3) })).toBe(false);
    expect(await isSelfServeTrialEligible('', NEVER_TRIALED)).toBe(false);
    expect(await isSelfServeTrialEligible(undefined, NEVER_TRIALED)).toBe(false);
    expect(mockPrisma.trialGrant.findUnique).not.toHaveBeenCalled();
  });

  it('is false once the email has any grant, and when the lookup fails (fail closed)', async () => {
    mockPrisma.trialGrant.findUnique.mockResolvedValue({ grantedAt: new Date('2026-08-01T00:00:00Z') });
    expect(await isSelfServeTrialEligible('person@example.com', NEVER_TRIALED)).toBe(false);

    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPrisma.trialGrant.findUnique.mockRejectedValue(new Error('db down'));
    expect(await isSelfServeTrialEligible('person@example.com', NEVER_TRIALED)).toBe(false);
    quiet.mockRestore();
  });

  it('is false for FORCE_PRO development accounts', async () => {
    process.env.FORCE_PRO = 'true';
    expect(await isSelfServeTrialEligible('person@example.com', NEVER_TRIALED)).toBe(false);
    delete process.env.FORCE_PRO;
  });
});
