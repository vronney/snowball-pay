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
    // canceling = subscription is still active/trialing but has a scheduled end date
    const isCanceling = (status === 'active' || status === 'trialing') && endsAt !== null;

    return NextResponse.json({
      paidTier: user?.paidTier ?? 'free',
      subscriptionStatus: status,
      subscriptionEndsAt: endsAt,
      isCanceling,
      hasCustomer: !!user?.stripeCustomerId,
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return serverError('Failed to fetch subscription');
  }
}
