import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CANCELLATION_REASON_VALUES } from '@/lib/cancellation';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError, badRequest } from '@/lib/auth-server';

const portalRequestSchema = z.object({
  cancellationReason: z.enum(CANCELLATION_REASON_VALUES).optional(),
}).strict();

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const parsedBody = portalRequestSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsedBody.success) {
    return badRequest('Invalid billing portal request.');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { stripeCustomerId: true, stripeSubscriptionId: true },
    });

    if (!user?.stripeCustomerId) {
      return badRequest('No billing account found. Please subscribe first.');
    }

    const stripe = getStripe();
    const { cancellationReason } = parsedBody.data;

    if (cancellationReason && user.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          metadata: {
            cancel_intent_reason: cancellationReason,
            cancel_intent_at: new Date().toISOString(),
          },
        });
      } catch (error) {
        // Reason capture is useful but must never block access to cancellation.
        console.error('Stripe cancellation intent metadata error:', error);
      }
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/dashboard?tab=settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return serverError('Failed to open billing portal');
  }
}
