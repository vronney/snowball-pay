import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getStripeProPriceId } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    // Fetch or create a Stripe customer for this user
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { stripeCustomerId: true, email: true },
    });

    let customerId = user?.stripeCustomerId;
    const stripe = getStripe();

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email ?? auth.user.email,
        metadata: { userId: auth.user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: auth.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: getStripeProPriceId(), quantity: 1 }],
      allow_promotion_codes: true,
      metadata: { userId: auth.user.id },
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId: auth.user.id },
      },
      success_url: `${appUrl}/dashboard?upgrade=success`,
      cancel_url: `${appUrl}/dashboard?upgrade=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return serverError('Failed to create checkout session');
  }
}
