import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import type Stripe from 'stripe';

// Required: disable body parsing so we can verify the raw signature
export const runtime = 'nodejs';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Maps a Stripe subscription status to our internal tier.
 * Only 'active' and 'trialing' are treated as Pro.
 */
function resolveSubscriptionFields(sub: Stripe.Subscription): {
  subscriptionStatus: string;
  paidTier: string;
  subscriptionEndsAt: Date | null;
} {
  const activeStatuses = ['active', 'trialing'];
  // Use cancel_at if set (scheduled cancellation), or trial_end if trialing
  const endTimestamp = sub.cancel_at ?? (sub.status === 'trialing' ? sub.trial_end : null);
  return {
    subscriptionStatus: sub.status,
    paidTier: activeStatuses.includes(sub.status) ? 'pro' : 'free',
    subscriptionEndsAt: endTimestamp ? new Date(endTimestamp * 1000) : null,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) {
          console.warn('Webhook: subscription missing userId metadata', sub.id);
          break;
        }
        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeSubscriptionId: sub.id,
            ...resolveSubscriptionFields(sub),
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;
        const endAt = sub.cancel_at ?? sub.trial_end ?? null;
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'canceled',
            paidTier: 'free',
            subscriptionEndsAt: endAt ? new Date(endAt * 1000) : null,
          },
        });
        break;
      }

      case 'checkout.session.completed': {
        // Ensure stripeCustomerId is persisted (it may have been set during
        // session creation, but we confirm here as a safety net).
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string | null;
        if (userId && customerId) {
          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: customerId },
          });
        }
        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
