/**
 * Abandoned-checkout recovery email, triggered by the Stripe
 * `checkout.session.expired` webhook (see /api/webhooks/stripe).
 *
 * One email per user per message version, ever — a user can abandon several
 * sessions and each fires its own expired event, so the versioned actionChecks
 * flag plus the Resend idempotency key prevent repeat sends. All failures are
 * logged and swallowed: a marketing email must never 500 the billing webhook
 * (Stripe would retry the whole event).
 */
import { render } from '@react-email/render';
import * as React from 'react';
import { prisma } from '@/lib/prisma';
import { EMAIL_FROM, APP_BASE_URL } from '@/lib/constants/app';
import {
  isEmailAlreadySent,
  markEmailSent,
  sendEmail,
} from '@/lib/services/emailService';
import { generateUnsubscribeToken } from '@/lib/unsubscribeToken';

export const CHECKOUT_RECOVERY_MESSAGE_VERSION = 'recovery_v1';
export const CHECKOUT_RECOVERY_CHECK_KEY = `checkout_recovery_${CHECKOUT_RECOVERY_MESSAGE_VERSION}_sent`;

export type CheckoutRecoveryResult =
  | 'sent'
  | 'skipped_no_user'
  | 'skipped_already_pro'
  | 'skipped_opted_out'
  | 'skipped_already_sent'
  | 'error';

export async function sendCheckoutRecoveryEmail(input: {
  userId: string;
  recoveryUrl: string;
}): Promise<CheckoutRecoveryResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        email: true,
        name: true,
        paidTier: true,
        preferences: { select: { emailOptOut: true } },
      },
    });
    if (!user?.email) return 'skipped_no_user';
    if (user.paidTier === 'pro') return 'skipped_already_pro';
    if (user.preferences?.emailOptOut) return 'skipped_opted_out';
    if (await isEmailAlreadySent(user.id, CHECKOUT_RECOVERY_CHECK_KEY)) {
      return 'skipped_already_sent';
    }

    const token = generateUnsubscribeToken(user.id);
    const unsubscribeUrl = `${APP_BASE_URL}/api/email/unsubscribe?userId=${user.id}&token=${token}`;
    // Imported lazily so the webhook's module graph stays free of JSX — only
    // an actual send pays for loading the email component.
    const { default: CheckoutRecoveryEmail } = await import('@/emails/CheckoutRecoveryEmail');
    const html = await render(
      React.createElement(CheckoutRecoveryEmail, {
        userName: user.name?.trim().split(' ')[0] || undefined,
        recoveryUrl: input.recoveryUrl,
        unsubscribeUrl,
      }),
    );

    const result = await sendEmail(
      user.email,
      EMAIL_FROM,
      'Your SnowballPay Pro upgrade is one step away',
      html,
      { idempotencyKey: `checkout-recovery-${CHECKOUT_RECOVERY_MESSAGE_VERSION}-${user.id}` },
    );
    if (!result.success) throw new Error(result.error);

    await markEmailSent(user.id, CHECKOUT_RECOVERY_CHECK_KEY);
    return 'sent';
  } catch (error) {
    console.error('[checkout recovery]', input.userId, error);
    return 'error';
  }
}
