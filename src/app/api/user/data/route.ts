import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import * as React from 'react';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';
import { getStripe } from '@/lib/stripe';
import { deleteAuth0User } from '@/lib/auth0-management';
import AccountDeletionEmail from '@/emails/AccountDeletionEmail';

async function cancelStripeSubscription(subscriptionId: string | null, status: string) {
  const cancelableStatuses = new Set(['active', 'trialing', 'past_due', 'unpaid']);
  if (!subscriptionId || !cancelableStatuses.has(status)) return false;

  try {
    await getStripe().subscriptions.cancel(subscriptionId);
    return true;
  } catch (error) {
    console.error('[delete account] failed to cancel Stripe subscription — continuing with deletion', error);
    return false;
  }
}

async function sendDeletionConfirmation(
  email: string,
  name?: string | null,
  subscriptionCanceled = false,
) {
  if (!email.includes('@')) {
    console.warn('[delete account] user email is missing; confirmation email skipped');
    return false;
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('[delete account] RESEND_API_KEY is not configured; confirmation email skipped');
    return false;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const displayName = name || email;

  const html = await render(
    React.createElement(AccountDeletionEmail, {
      userName: displayName,
      subscriptionCanceled,
    }),
  );

  try {
    await resend.emails.send({
      from: 'SnowballPay <noreply@getsnowballpay.com>',
      to: email,
      subject: 'Your SnowballPay account has been deleted',
      html,
    });
    return true;
  } catch (error) {
    console.error('[delete account] confirmation email failed', error);
    return false;
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const userId = auth.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        auth0Id: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    });

    if (!user) {
      return NextResponse.json({ ok: true, emailSent: false });
    }

    const subscriptionCanceled = await cancelStripeSubscription(
      user.stripeSubscriptionId,
      user.subscriptionStatus,
    );

    await prisma.$transaction(async (tx) => {
      await tx.paymentRecord.deleteMany({ where: { userId } });
      await tx.balanceSnapshot.deleteMany({ where: { userId } });
      await tx.payoffStep.deleteMany({
        where: { payoffPlan: { userId } },
      });
      await tx.payoffPlan.deleteMany({ where: { userId } });
      await tx.aiRecommendationCache.deleteMany({ where: { userId } });
      await tx.userPreferences.deleteMany({ where: { userId } });
      await tx.uploadedDocument.deleteMany({ where: { userId } });
      await tx.debt.deleteMany({ where: { userId } });
      await tx.expense.deleteMany({ where: { userId } });
      await tx.income.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    // Auth0 deletion runs after the DB transaction so a failure here leaves
    // the user with no data (blank slate on re-login) rather than no login access
    // but data still present, which is unrecoverable without support intervention.
    let auth0Deleted = false;
    try {
      await deleteAuth0User(user.auth0Id);
      auth0Deleted = true;
    } catch (error) {
      console.error('[delete account] Auth0 deletion failed after DB delete — manual cleanup required', error);
    }

    const emailSent = await sendDeletionConfirmation(user.email, user.name, subscriptionCanceled);

    return NextResponse.json({ ok: true, emailSent, subscriptionCanceled, auth0Deleted });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return serverError('Failed to delete account');
  }
}
