import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';

const ACTIVE_STATUSES = ['active', 'trialing'];
const TRIAL_GRACE_MS = 2 * 60 * 60 * 1000;
const PRO_MONTHLY_PRICE = 9;

function isStale(endsAt: Date | null): boolean {
  return endsAt !== null && endsAt.getTime() + TRIAL_GRACE_MS < Date.now();
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        paidTier: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    let { paidTier = 'free', subscriptionStatus: status = 'inactive' } = user ?? {};
    let endsAt = user?.subscriptionEndsAt ?? null;

    // When the DB shows a stale trialing row (trial_end elapsed, grace window
    // closed) but we have a subscription ID, fetch live status from Stripe and
    // repair the row. Recovers accounts whose webhook was missed.
    if (isStale(endsAt) && status === 'trialing' && user?.stripeSubscriptionId) {
      try {
        const sub = await getStripe().subscriptions.retrieve(user.stripeSubscriptionId);
        const endTs = sub.cancel_at ?? (sub.status === 'trialing' ? sub.trial_end : null);
        const patch = {
          subscriptionStatus: sub.status,
          paidTier: ACTIVE_STATUSES.includes(sub.status) ? 'pro' : 'free',
          subscriptionEndsAt: endTs ? new Date(endTs * 1000) : null,
        };
        await prisma.user.update({ where: { id: auth.user.id }, data: patch });
        status = patch.subscriptionStatus;
        paidTier = patch.paidTier;
        endsAt = patch.subscriptionEndsAt;
      } catch {
        // Stripe fetch failed — fall through; isStale() will return free below.
      }
    }

    const expired = isStale(endsAt);
    const isCanceling = !expired && status === 'active' && endsAt !== null;

    return NextResponse.json({
      paidTier: expired ? 'free' : paidTier,
      subscriptionStatus: expired ? 'canceled' : status,
      subscriptionEndsAt: endsAt,
      isCanceling,
      hasCustomer: !!user?.stripeCustomerId,
      monthlyPrice: PRO_MONTHLY_PRICE,
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return serverError('Failed to fetch subscription');
  }
}
