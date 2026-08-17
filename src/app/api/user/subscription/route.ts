import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripe, PLANS } from '@/lib/stripe';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';
import { plaidAccessAllowed } from '@/lib/plaid';
import { resolveBillingVerdict } from '@/lib/gates';

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

    // One read pair for every gate verdict (this endpoint is hot: checkout
    // polling + several client consumers). resolveBillingVerdict re-reads the
    // row the stale-repair above has already patched if it ran, and its
    // grant-anchored trial end matches exactly what getUserTier grants.
    const verdict = await resolveBillingVerdict(auth.user.id);
    const trialEnd = verdict.signupTrialEndsAt;
    const signupTrialActive =
      !verdict.paidPro && trialEnd !== null && trialEnd.getTime() > Date.now();

    return NextResponse.json({
      paidTier: expired ? 'free' : paidTier,
      subscriptionStatus: expired ? 'canceled' : status,
      subscriptionEndsAt: endsAt,
      isCanceling,
      hasCustomer: !!user?.stripeCustomerId,
      monthlyPrice: PLANS.pro.price,
      // The ACTUAL gate the Plaid routes enforce (allowlist OR PAID Pro) so
      // the UI can tell a downgraded user their bank sync is paused. Same rule
      // canUsePlaid delegates to — deriving from the tier fields above can
      // diverge (e.g. past_due keeps paidTier 'pro' here but fails the gate).
      plaidEligible: plaidAccessAllowed(auth.user.email, verdict.paidPro),
      // The ACTUAL verdict every Pro-gated API route enforces. Client feature
      // gates must use this, not paidTier — past_due keeps paidTier 'pro'
      // while isPro() (and therefore every gated route) says free.
      proEligible: verdict.proEligible,
      // Free signup trial (full Pro on every new account, no card).
      // The countdown banner and post-expiry upgrade prompt key off these.
      signupTrialEndsAt: trialEnd,
      signupTrialActive,
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return serverError('Failed to fetch subscription');
  }
}
