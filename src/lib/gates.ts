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

  // Guard against webhook delays: if the known end timestamp has passed,
  // access is no longer Pro even if status has not been updated yet.
  const now = new Date();
  const isExpired = user.subscriptionEndsAt !== null && user.subscriptionEndsAt < now;
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
