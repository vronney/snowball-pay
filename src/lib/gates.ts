import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { PLANS, type PaidTier } from '@/lib/stripe';
import { signupTrialEndsAt, SIGNUP_TRIAL_LAUNCH } from '@/lib/billing';
import { trialGrantKey } from '@/lib/trialGrantKey';

export const FREE_DEBT_LIMIT = PLANS.free.debtLimit;

// Guard against webhook delays: allow 2 hours after the end date for webhook
// delivery. After that, if the subscription hasn't been updated (including
// legacy trialing rows whose trial_end has passed), treat it as expired.
const SUBSCRIPTION_GRACE_MS = 2 * 60 * 60 * 1000;
const ACTIVE_STATUSES = ['active', 'trialing'];

interface BillingUser {
  email: string;
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
      email: true,
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

type GrantLookup = { grantedAt: Date } | null | 'failed';

/** The email's TrialGrant, null when it has none, 'failed' when the read itself failed. */
async function findTrialGrant(email: string): Promise<GrantLookup> {
  try {
    return await prisma.trialGrant.findUnique({
      where: { emailHash: trialGrantKey(email) },
      select: { grantedAt: true },
    });
  } catch (error) {
    // trial_grants not deployed yet or a transient read failure. Callers
    // decide the fallback; log it so a persistently failing lookup is visible.
    console.error('[gates] TrialGrant lookup failed', error);
    return 'failed';
  }
}

/**
 * Resolves when the user's free signup window ends, or null when they have
 * none. Anchored to the TrialGrant tombstone (keyed by email, written at
 * first provisioning, survives account deletion) so deleting the account and
 * re-provisioning — which mints a fresh User.createdAt — cannot restart the
 * clock.
 *
 * - Post-launch accounts fall back to createdAt when no grant exists
 *   (accounts provisioned before grants shipped) or the lookup fails.
 * - Pre-launch accounts use a grant only if one exists (spec §6.4): a
 *   self-serve trial they started, or a pre-launch-dated deletion tombstone
 *   that signupTrialEndsAt resolves to no window. They never fall back to
 *   createdAt, so no existing pre-launch account gains a window.
 */
async function resolveSignupTrialEnd(user: BillingUser): Promise<Date | null> {
  // The instanceof guard keeps partial rows (test doubles) on the safe path.
  if (!(user.createdAt instanceof Date)) return null;
  const preLaunch = user.createdAt.getTime() < SIGNUP_TRIAL_LAUNCH.getTime();
  const fallback = preLaunch ? null : signupTrialEndsAt(user.createdAt);

  if (typeof user.email !== 'string' || !user.email) return fallback;
  const grant = await findTrialGrant(user.email);
  if (grant === null || grant === 'failed') return fallback;
  return signupTrialEndsAt(grant.grantedAt);
}

/**
 * Every billing verdict a caller needs from ONE user read + one grant read.
 * The subscription endpoint is hot (post-checkout polling, several client
 * consumers), and calling isPro / hasPaidPro / canUsePlaid individually
 * re-reads the same row each time.
 */
export interface BillingVerdict {
  paidPro: boolean;
  proEligible: boolean;
  signupTrialEndsAt: Date | null;
}

export async function resolveBillingVerdict(userId: string): Promise<BillingVerdict> {
  if (forceProInDev()) {
    return { paidPro: true, proEligible: true, signupTrialEndsAt: null };
  }
  const user = await fetchBillingUser(userId);
  if (!user) return { paidPro: false, proEligible: false, signupTrialEndsAt: null };

  const paidPro = hasActiveSubscription(user);
  const signupTrialEndsAt = await resolveSignupTrialEnd(user);
  const trialActive =
    signupTrialEndsAt !== null && signupTrialEndsAt.getTime() > Date.now();
  return { paidPro, proEligible: paidPro || trialActive, signupTrialEndsAt };
}

/**
 * Whether this account may start the self-serve trial (spec §6.4): not Pro,
 * never had a signup window, and no TrialGrant for its email. The window
 * clause stops a post-launch account whose grant write failed (it falls back
 * to its createdAt window) from getting a second trial. A failed grant read
 * is not eligible: never offer a trial we can't prove is the first.
 */
export async function isSelfServeTrialEligible(
  email: string | null | undefined,
  verdict: BillingVerdict,
): Promise<boolean> {
  if (forceProInDev()) return false;
  if (verdict.proEligible || verdict.signupTrialEndsAt !== null) return false;
  if (typeof email !== 'string' || !email) return false;
  return (await findTrialGrant(email)) === null;
}

/**
 * The user's signup-window end, for display and checkout trial alignment.
 * Null when the account has no window (pre-launch account or no user row).
 */
export async function getSignupTrialEnd(userId: string): Promise<Date | null> {
  const user = await fetchBillingUser(userId);
  return user ? resolveSignupTrialEnd(user) : null;
}

/**
 * Returns the user's current tier: 'pro' when they have an active paid
 * subscription OR are inside the free signup window (every new account's
 * first SIGNUP_TRIAL_DAYS include Pro, no card required). Defaults to 'free'
 * if no user row exists yet.
 */
export async function getUserTier(userId: string): Promise<PaidTier> {
  if (forceProInDev()) return 'pro';

  const user = await fetchBillingUser(userId);
  if (!user) return 'free';
  if (hasActiveSubscription(user)) return 'pro';

  const trialEnd = await resolveSignupTrialEnd(user);
  if (trialEnd !== null && trialEnd.getTime() > Date.now()) return 'pro';
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
