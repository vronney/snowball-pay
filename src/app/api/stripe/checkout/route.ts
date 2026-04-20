import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getStripeProPriceId } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';

function isMissingStripeCustomerError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: string; param?: string; message?: string };
  return (
    maybe.code === 'resource_missing' &&
    (maybe.param === 'customer' || /no such customer/i.test(maybe.message ?? ''))
  );
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    // Fetch or create a Stripe customer for this user.
    // If Stripe reports the stored customer is missing (usually test/live mismatch),
    // we recreate it and retry checkout once.
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { stripeCustomerId: true, email: true },
    });

    let customerId = user?.stripeCustomerId;
    const stripe = getStripe();
    const priceId = getStripeProPriceId();
    const userEmail = user?.email ?? auth.user.email;

    const createAndPersistCustomer = async () => {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId: auth.user.id },
      });
      await prisma.user.update({
        where: { id: auth.user.id },
        data: { stripeCustomerId: customer.id },
      });
      return customer.id;
    };

    const createCheckoutSession = (customer: string) =>
      stripe.checkout.sessions.create({
        customer,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        metadata: { userId: auth.user.id },
        subscription_data: {
          trial_period_days: 7,
          metadata: { userId: auth.user.id },
        },
        success_url: `${appUrl}/dashboard?upgrade=success`,
        cancel_url: `${appUrl}/dashboard?upgrade=canceled`,
      });

    if (!customerId) customerId = await createAndPersistCustomer();

    let session;
    try {
      session = await createCheckoutSession(customerId);
    } catch (error) {
      if (!customerId || !isMissingStripeCustomerError(error)) throw error;
      console.warn('Stripe customer missing; recreating customer and retrying checkout', {
        userId: auth.user.id,
        staleCustomerId: customerId,
      });
      customerId = await createAndPersistCustomer();
      session = await createCheckoutSession(customerId);
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return serverError('Failed to create checkout session');
  }
}
