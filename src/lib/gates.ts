import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { PLANS, type PaidTier } from '@/lib/stripe';

export const FREE_DEBT_LIMIT = PLANS.free.debtLimit;

/**
 * Returns the user's current paid tier from the database.
 * Defaults to 'free' if no user row exists yet.
 */
export async function getUserTier(userId: string): Promise<PaidTier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { paidTier: true, subscriptionStatus: true, subscriptionEndsAt: true },
  });
  if (!user) return 'free';

  // Guard against webhook delays: allow 2 hours after the end date for webhook
  // delivery. After that, if the subscription hasn't been updated (including
  // trialing whose trial_end has passed), treat it as expired.
  const now = new Date();
  const TRIAL_GRACE_MS = 2 * 60 * 60 * 1000;
  const isExpired =
    user.subscriptionEndsAt !== null &&
    user.subscriptionEndsAt.getTime() + TRIAL_GRACE_MS < now.getTime();
  if (isExpired) return 'free';

  // Treat canceled / inactive / past_due as free unless still active/trialing.
  const activeStatuses = ['active', 'trialing'];
  if (user.paidTier === 'pro' && activeStatuses.includes(user.subscriptionStatus)) {
    return 'pro';
  }
  return 'free';
}

/**
 * Returns true when the user has an active Pro subscription.
 */
export async function isPro(userId: string): Promise<boolean> {
  return (await getUserTier(userId)) === 'pro';
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
