import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { PLANS, type PaidTier } from '@/lib/stripe';
import { isSignupTrialActive } from '@/lib/billing';

export const FREE_DEBT_LIMIT = PLANS.free.debtLimit;

// Guard against webhook delays: allow 2 hours after the end date for webhook
// delivery. After that, if the subscription hasn't been updated (including
// legacy trialing rows whose trial_end has passed), treat it as expired.
const SUBSCRIPTION_GRACE_MS = 2 * 60 * 60 * 1000;
const ACTIVE_STATUSES = ['active', 'trialing'];

interface BillingUser {
  paidTier: string;
  subscriptionStatus: string;
  subscriptionEndsAt: Date | null;
  createdAt: Date;
}

// Dev override: set FORCE_PRO=true in .env.local to test Pro features locally
// without needing a real Stripe subscription. Never enabled in production.
function forceProInDev(): boolean {
  return process.env.FORCE_PRO === 'true' && process.env.NODE_ENV !== 'production';
}

function fetchBillingUser(userId: string): Promise<BillingUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      paidTier: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      createdAt: true,
    },
  });
}

/**
 * Whether the user has a live paid Pro subscription: tier 'pro' with an
 * active/trialing Stripe status, not past its end date + grace window.
 * Treats canceled / inactive / past_due as not subscribed.
 */
function hasActiveSubscription(user: BillingUser): boolean {
  const isExpired =
    user.subscriptionEndsAt !== null &&
    user.subscriptionEndsAt.getTime() + SUBSCRIPTION_GRACE_MS < Date.now();
  if (isExpired) return false;
  return user.paidTier === 'pro' && ACTIVE_STATUSES.includes(user.subscriptionStatus);
}

/**
 * Returns the user's current tier: 'pro' when they have an active paid
 * subscription OR are inside the free signup window (every account's first
 * SIGNUP_TRIAL_DAYS include Pro, no card required). Defaults to 'free' if no
 * user row exists yet.
 */
export async function getUserTier(userId: string): Promise<PaidTier> {
  if (forceProInDev()) return 'pro';

  const user = await fetchBillingUser(userId);
  if (!user) return 'free';
  if (hasActiveSubscription(user)) return 'pro';
  if (user.createdAt && isSignupTrialActive(user.createdAt)) return 'pro';
  return 'free';
}

/**
 * Returns true when the user has Pro access — paid subscription or the free
 * signup window. Gates every Pro feature EXCEPT ones with real per-use cost;
 * those use hasPaidPro().
 */
export async function isPro(userId: string): Promise<boolean> {
  return (await getUserTier(userId)) === 'pro';
}

/**
 * Paid subscription only — excludes the free signup window. Use for anything
 * that costs real money per use (Plaid bills per connected account per month):
 * signup-window users have no payment method on file, so free access must not
 * open metered spend.
 */
export async function hasPaidPro(userId: string): Promise<boolean> {
  if (forceProInDev()) return true;

  const user = await fetchBillingUser(userId);
  return user !== null && hasActiveSubscription(user);
}

/**
 * Returns a 403 JSON response with an upgrade payload that the client can
 * detect to show the UpgradeModal.
 */
export function upgradeRequired(feature: string) {
  return NextResponse.json(
    {
      error: 'upgrade_required',
      feature,
      message: `${feature} is a Pro feature. Upgrade to unlock it.`,
    },
    { status: 403 }
  );
}
