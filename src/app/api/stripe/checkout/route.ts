import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getStripeProPriceId } from '@/lib/stripe';
import { getSignupTrialEnd } from '@/lib/gates';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';
import { ANALYTICS_CONSENT_KEY } from '@/lib/analyticsConsent';

// Short session expiry (Stripe minimum is 30 minutes; default is 24 hours) so
// the abandoned-checkout recovery email follows while intent is still warm.
const CHECKOUT_SESSION_TTL_MINUTES = 120;

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
  const analyticsConsent =
    request.cookies.get(ANALYTICS_CONSENT_KEY)?.value === 'granted'
      ? 'granted'
      : 'denied';

  try {
    // Fetch or create a Stripe customer for this user.
    // If Stripe reports the stored customer is missing (usually test/live mismatch),
    // we recreate it and retry checkout once.
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { stripeCustomerId: true, email: true },
    });

    let customerId = user?.stripeCustomerId;
    // Grant-anchored (not createdAt) so a deleted-and-recreated account can't
    // mint a fresh Stripe trial either. The EXACT end timestamp goes to Stripe
    // as subscription_data.trial_end, so the first charge lands when the free
    // window ends — no whole-day rounding drift, and no extension if the
    // session is completed later. Stripe requires trial_end to be in the
    // future; with less than an hour left we skip the trial and charge now.
    const MIN_TRIAL_REMAINING_MS = 60 * 60 * 1000;
    const signupTrialEnd = await getSignupTrialEnd(auth.user.id);
    const trialEndTs =
      signupTrialEnd && signupTrialEnd.getTime() - Date.now() > MIN_TRIAL_REMAINING_MS
        ? Math.floor(signupTrialEnd.getTime() / 1000)
        : null;
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
        // Abandoned-checkout recovery: when the session expires unpaid, Stripe
        // fires checkout.session.expired with a 30-day recovery URL that the
        // webhook emails to the user (see /api/webhooks/stripe).
        after_expiration: {
          recovery: { enabled: true, allow_promotion_codes: true },
        },
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_TTL_MINUTES * 60,
        metadata: { userId: auth.user.id, billing: 'monthly', analyticsConsent },
        // The free trial lives on the account (every signup gets
        // SIGNUP_TRIAL_DAYS days of Pro, no card). Subscribing MID-trial keeps
        // the promised days: billing starts exactly when the free window ends.
        // Past it, there is no Stripe trial — checkout charges immediately.
        subscription_data: {
          ...(trialEndTs ? { trial_end: trialEndTs } : {}),
          metadata: { userId: auth.user.id, billing: 'monthly', analyticsConsent },
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
