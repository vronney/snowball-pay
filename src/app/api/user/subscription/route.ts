import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';

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
      },
    });

    const endsAt = user?.subscriptionEndsAt ?? null;
    const status = user?.subscriptionStatus ?? 'inactive';
    const now = new Date();

    // If the subscription end date has already passed, treat it as expired regardless
    // of what's in the DB (handles webhook delivery delays).
    const isExpired = endsAt !== null && new Date(endsAt) < now;
    const effectiveStatus = isExpired ? 'canceled' : status;
    const effectiveTier = isExpired ? 'free' : (user?.paidTier ?? 'free');
    // Trialing subscriptions naturally have a trial_end date; that should not be
    // shown as "Canceling". Only active subscriptions with an end date are treated
    // as scheduled to cancel.
    const isCanceling = effectiveStatus === 'active' && endsAt !== null;

    return NextResponse.json({
      paidTier: effectiveTier,
      subscriptionStatus: effectiveStatus,
      subscriptionEndsAt: endsAt,
      isCanceling,
      hasCustomer: !!user?.stripeCustomerId,
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return serverError('Failed to fetch subscription');
  }
}
