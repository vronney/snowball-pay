/**
 * GET /api/cron/trial-emails
 *
 * Daily. Announces the free-trial boundary by email, once per boundary:
 *   ending — 2 to 4 days before the free Pro window closes
 *   ended  — inside the 7-day post-trial prompt window after it closes
 *
 * The dashboard already shows a countdown banner and a post-trial modal, but
 * only to users who open the app; this reaches the ones who don't.
 *
 * Entry: account created on or after the trial launch and recent enough to
 * still be inside a window, email allowed. Skipped: paid Pro subscribers
 * (no trial to lose), accounts with no signup window, previously sent.
 * Delivery is recorded on the TrialGrant (survives account deletion) and,
 * as a fallback for accounts without a grant, in UserPreferences.
 * Auth: Authorization: Bearer <CRON_SECRET> (Vercel cron supplies this).
 */

import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import * as React from 'react';
import { prisma } from '@/lib/prisma';
import { EMAIL_FROM, APP_BASE_URL } from '@/lib/constants/app';
import {
  handleMissingResendConfig,
  markEmailSent,
  sendEmail,
  verifyCronRequest,
} from '@/lib/services/emailService';
import { getSignupTrialEnd, hasPaidPro } from '@/lib/gates';
import { SIGNUP_TRIAL_LAUNCH } from '@/lib/billing';
import { PLANS } from '@/lib/stripe';
import {
  TRIAL_EMAIL_VERSION,
  daysSinceTrialEnd,
  daysUntilTrialEnd,
  hasReceivedTrialEmail,
  pickTrialEmail,
  trialCandidateCreatedAfter,
  trialCheckKey,
  trialGrantSentField,
  type TrialEmailKind,
} from '@/lib/lifecycleTrial';
import { trialGrantKey } from '@/lib/trialGrantKey';
import { calculatePlanMetrics, calculateMinimumsOnlyResult } from '@/lib/payoffPlan';
import { generateUnsubscribeToken } from '@/lib/unsubscribeToken';
import TrialEndingSoonEmail from '@/emails/TrialEndingSoonEmail';
import TrialEndedEmail from '@/emails/TrialEndedEmail';
import type { Debt } from '@/types';

const MAX_SENDS_PER_RUN = 50;
// Bounds the scan, not just the sends: every candidate costs a trial-end and
// paid-status read. Signups run at low double digits per month, so this is
// headroom, not a limit anyone should hit; `limited` in the response says
// when it was.
const MAX_CANDIDATES_PER_RUN = 500;

function buildKeepProUrl(kind: TrialEmailKind): string {
  // ?checkout=pro is the same deep link the pricing page uses; DashboardClient
  // starts Stripe Checkout for it once the subscription resolves. An account
  // with no plan yet is bounced to onboarding first, which carries the
  // parameter through and hands it back to the dashboard on completion.
  const url = new URL('/dashboard', APP_BASE_URL);
  url.searchParams.set('checkout', 'pro');
  url.searchParams.set('utm_source', 'lifecycle');
  url.searchParams.set('utm_medium', 'email');
  url.searchParams.set('utm_campaign', `trial_${kind}`);
  url.searchParams.set('utm_content', TRIAL_EMAIL_VERSION);
  return url.toString();
}

/** "September 16" in the product's home timezone. */
function formatTrialEndDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });
}

/**
 * Durable delivery record. The grant outlives the account, so a user who
 * deletes and recreates inside the window keeps the same "already sent"
 * state; UserPreferences.actionChecks is the fallback when no grant exists.
 * A missing grant table/column (db push pending) reads as "not sent" and
 * logs, rather than blocking the run.
 */
async function grantSentAt(email: string, kind: TrialEmailKind): Promise<Date | null> {
  try {
    const grant = await prisma.trialGrant.findUnique({
      where: { emailHash: trialGrantKey(email) },
      select: { endingEmailSentAt: true, endedEmailSentAt: true },
    });
    return grant?.[trialGrantSentField(kind)] ?? null;
  } catch (error) {
    console.error('[cron trial-emails] TrialGrant read failed', error);
    return null;
  }
}

async function recordSent(userId: string, email: string, kind: TrialEmailKind): Promise<void> {
  await markEmailSent(userId, trialCheckKey(kind));
  try {
    await prisma.trialGrant.update({
      where: { emailHash: trialGrantKey(email) },
      data: { [trialGrantSentField(kind)]: new Date() },
    });
  } catch (error) {
    // No grant row (pre-grant account) or column not pushed yet: the
    // actionChecks flag above still prevents a resend for this account.
    console.error('[cron trial-emails] TrialGrant write failed', error);
  }
}

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  if (!process.env.RESEND_API_KEY) return handleMissingResendConfig();

  const now = new Date();
  const createdAfter = new Date(
    Math.max(SIGNUP_TRIAL_LAUNCH.getTime(), trialCandidateCreatedAfter(now).getTime()),
  );

  const candidates = await prisma.user.findMany({
    where: {
      createdAt: { gte: createdAfter },
      OR: [{ preferences: null }, { preferences: { emailOptOut: false } }],
    },
    orderBy: { createdAt: 'asc' },
    take: MAX_CANDIDATES_PER_RUN,
    select: {
      id: true,
      email: true,
      name: true,
      preferences: { select: { actionChecks: true } },
      debts: {
        where: { balance: { gt: 0 } },
        select: {
          id: true, balance: true, originalBalance: true, interestRate: true, minimumPayment: true,
          name: true, category: true, creditLimit: true, createdAt: true, updatedAt: true, userId: true, dueDate: true,
        },
      },
      income: true,
      expenses: { select: { amount: true } },
    },
  });

  const results = {
    ok: true,
    candidates: candidates.length,
    ending: 0,
    ended: 0,
    errors: 0,
    skippedOutsideWindow: 0,
    skippedPaid: 0,
    skippedPreviouslySent: 0,
    limited: candidates.length >= MAX_CANDIDATES_PER_RUN,
    messageVersion: TRIAL_EMAIL_VERSION,
  };

  for (const user of candidates) {
    if (results.ending + results.ended >= MAX_SENDS_PER_RUN) {
      results.limited = true;
      break;
    }

    try {
      // Grant-anchored (survives delete-and-recreate), same source of truth
      // the dashboard banner and checkout use.
      const trialEndsAt = await getSignupTrialEnd(user.id);
      const kind = trialEndsAt ? pickTrialEmail(trialEndsAt, now) : null;
      if (!trialEndsAt || !kind) {
        results.skippedOutsideWindow++;
        continue;
      }
      if (
        hasReceivedTrialEmail(user.preferences?.actionChecks, kind) ||
        (await grantSentAt(user.email, kind)) !== null
      ) {
        results.skippedPreviouslySent++;
        continue;
      }
      // A subscriber has nothing to lose at the boundary — mark so the row
      // is not re-evaluated tomorrow.
      if (await hasPaidPro(user.id)) {
        await recordSent(user.id, user.email, kind);
        results.skippedPaid++;
        continue;
      }

      const unsubscribeUrl = `${APP_BASE_URL}/api/email/unsubscribe?userId=${user.id}&token=${generateUnsubscribeToken(user.id)}`;
      const common = {
        userName: user.name?.split(' ')[0] || undefined,
        debtCount: user.debts.length,
        monthlyPrice: PLANS.pro.price,
        keepProUrl: buildKeepProUrl(kind),
        unsubscribeUrl,
      };

      let subject: string;
      let element: React.ReactElement;
      if (kind === 'ending') {
        const daysLeft = daysUntilTrialEnd(trialEndsAt, now);
        subject = `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} of free Pro left`;
        element = React.createElement(TrialEndingSoonEmail, {
          ...common,
          daysLeft,
          trialEndDate: formatTrialEndDate(trialEndsAt),
          interestAvoided: interestAvoidedFor(user.debts as Debt[], user.income, user.expenses),
        });
      } else {
        // A send can trail the boundary by a day (cron cadence) or more
        // (retries), so only the boundary's own day says "today".
        const endedOn =
          daysSinceTrialEnd(trialEndsAt, now) === 0
            ? 'today'
            : `on ${formatTrialEndDate(trialEndsAt)}`;
        subject = `Your free Pro ended ${endedOn}. Your plan did not.`;
        element = React.createElement(TrialEndedEmail, { ...common, endedOn });
      }

      const result = await sendEmail(
        user.email,
        EMAIL_FROM,
        subject,
        await render(element),
        { idempotencyKey: `trial-${kind}-${TRIAL_EMAIL_VERSION}-${user.id}` },
      );
      if (!result.success) throw new Error(result.error);

      await recordSent(user.id, user.email, kind);
      results[kind]++;
    } catch (error) {
      console.error('[cron trial-emails]', user.id, error);
      results.errors++;
    }
  }

  return NextResponse.json(results);
}

/**
 * Projected interest avoided vs minimums-only — the same number the dashboard
 * hero shows. Undefined when there is no plan; the template then omits the
 * sentence rather than inventing a zero.
 */
function interestAvoidedFor(
  debts: Debt[],
  income: Parameters<typeof calculatePlanMetrics>[1],
  expenses: Array<{ amount: number }>,
): number | undefined {
  if (!income || debts.length === 0) return undefined;
  try {
    const metrics = calculatePlanMetrics(debts, income, expenses);
    if (!metrics) return undefined;
    const minimums = calculateMinimumsOnlyResult(debts);
    const saved = Math.round(minimums.totalInterestPaid - metrics.result.totalInterestPaid);
    return saved > 0 ? saved : undefined;
  } catch (error) {
    console.error('[cron trial-emails] plan calc failed', error);
    return undefined;
  }
}
