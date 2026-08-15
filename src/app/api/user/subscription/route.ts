import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripe, PLANS } from '@/lib/stripe';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';
import { canUsePlaid } from '@/lib/plaid';
import { isPro } from '@/lib/gates';
import { signupTrialEndsAt } from '@/lib/billing';

const ACTIVE_STATUSES = ['active', 'trialing'];
const TRIAL_GRACE_MS = 2 * 60 * 60 * 1000;
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
        createdAt: true,
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

    // The free signup window: every account's first days include Pro, no card.
    // Only meaningful while the user isn't on a live paid subscription.
    const paidPro = !expired && paidTier === 'pro' && ACTIVE_STATUSES.includes(status);
    const trialEnd = user?.createdAt ? signupTrialEndsAt(user.createdAt) : null;
    const signupTrialActive =
      !paidPro && trialEnd !== null && trialEnd.getTime() > Date.now();

    return NextResponse.json({
      paidTier: expired ? 'free' : paidTier,
      subscriptionStatus: expired ? 'canceled' : status,
      subscriptionEndsAt: endsAt,
      isCanceling,
      hasCustomer: !!user?.stripeCustomerId,
      monthlyPrice: PLANS.pro.price,
      // The ACTUAL gate the Plaid routes enforce (allowlist OR active Pro) so
      // the UI can tell a downgraded user their bank sync is paused. Must be
      // this exact function — deriving from the tier fields above can diverge
      // (e.g. past_due keeps paidTier 'pro' here but fails canUsePlaid).
      plaidEligible: await canUsePlaid(auth.user.id, auth.user.email),
      // The ACTUAL verdict every Pro-gated API route enforces. Client feature
      // gates must use this, not paidTier — past_due keeps paidTier 'pro'
      // while isPro() (and therefore every gated route) says free.
      proEligible: await isPro(auth.user.id),
      // Free signup window (7 days of Pro on every new account, no card).
      // The countdown banner and post-expiry upgrade prompt key off these.
      signupTrialEndsAt: trialEnd,
      signupTrialActive,
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return serverError('Failed to fetch subscription');
  }
}
