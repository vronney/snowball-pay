/**
 * GET /api/cron/trial-emails
 *
 * Daily. Announces the free-trial boundary by email, once per boundary, at
 * most one email per account per run:
 *   ending  — 2 to 4 days before the free Pro window closes
 *   ended   — inside the 7-day post-trial prompt window after it closes
 *   stopped — from day 3 of that window, to accounts with no plan activity
 *             since the close: a one-question "what made you stop?" ask
 *
 * The dashboard already shows a countdown banner and a post-trial modal, but
 * only to users who open the app; this reaches the ones who don't.
 *
 * Entry: account created on or after the trial launch and recent enough to
 * still be inside a window, or an older account whose self-serve trial
 * started that recently (spec §6.4); email allowed. Skipped: paid Pro subscribers
 * (no trial to lose), accounts with no signup window, previously sent.
 * Delivery is recorded on the TrialGrant (survives account deletion) and,
 * as a fallback for accounts without a grant, in UserPreferences.
 * Auth: Authorization: Bearer <CRON_SECRET> (Vercel cron supplies this).
 */

import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import * as React from 'react';
import { prisma } from '@/lib/prisma';
import { EMAIL_FROM, APP_BASE_URL, SUPPORT_EMAIL } from '@/lib/constants/app';
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
  dueTrialEmails,
  hasReceivedTrialEmail,
  trialCandidateCreatedAfter,
  trialCheckKey,
  trialGrantSentField,
  type TrialEmailKind,
  type TrialGrantSentField,
} from '@/lib/lifecycleTrial';
import { trialGrantKey } from '@/lib/trialGrantKey';
import { getLatestPlanEditAt } from '@/lib/lifecycleWinBack';
import { calculatePlanMetrics, calculateMinimumsOnlyResult } from '@/lib/payoffPlan';
import { generateUnsubscribeToken } from '@/lib/unsubscribeToken';
import TrialEndingSoonEmail from '@/emails/TrialEndingSoonEmail';
import TrialEndedEmail from '@/emails/TrialEndedEmail';
import TrialStoppedEmail from '@/emails/TrialStoppedEmail';
import type { Debt } from '@/types';
import type { Prisma } from '@prisma/client';

const MAX_SENDS_PER_RUN = 50;
// Bounds the scan, not just the sends: every candidate costs a trial-end and
// paid-status read. Signups run at low double digits per month, so this is
// headroom, not a limit anyone should hit; `limited` in the response says
// when it was.
const MAX_CANDIDATES_PER_RUN = 500;

/**
 * Shared by both scan arms. `createdAt` and `preferences.trialStartedAt` are
 * both selected because the scan is ordered by whichever one anchors the
 * account's trial, not by signup date alone.
 */
const CANDIDATE_SELECT = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  // Stamped by the debt/expense delete routes; a delete is a plan edit too.
  planEditedAt: true,
  preferences: { select: { actionChecks: true, trialStartedAt: true } },
  // Unfiltered: a debt paid down to zero is still a plan edit, and the
  // "stopped" activity check must see it. Plan math uses openDebts().
  debts: {
    select: {
      id: true, balance: true, originalBalance: true, interestRate: true, minimumPayment: true,
      name: true, category: true, creditLimit: true, createdAt: true, updatedAt: true, userId: true, dueDate: true,
      inPlan: true,
    },
  },
  income: true,
  // updatedAt: a recurring-expense edit is post-trial activity for "stopped".
  expenses: { select: { amount: true, updatedAt: true } },
  // Latest payment is the activity signal for "stopped"; the count is its copy.
  paymentRecords: { orderBy: { paidAt: 'desc' }, take: 1, select: { paidAt: true } },
  _count: { select: { paymentRecords: true } },
} satisfies Prisma.UserSelect;

type TrialCandidate = Prisma.UserGetPayload<{ select: typeof CANDIDATE_SELECT }>;

/**
 * When this account's trial window opened: its own self-serve start if it has
 * one, otherwise the signup date. Prisma cannot ORDER BY a COALESCE of a scalar
 * and a relation field, so the two arms are queried apart and coalesced here.
 */
function trialAnchor(user: TrialCandidate): number {
  return (user.preferences?.trialStartedAt ?? user.createdAt).getTime();
}

/** Debts with a balance left: what the plan math and the debt count mean. */
function openDebts(user: TrialCandidate): Debt[] {
  return user.debts.filter((debt) => debt.balance > 0) as Debt[];
}

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
 * logs, rather than blocking the run. Only the requested kind's column is
 * selected, so a column not yet pushed (stoppedEmailSentAt) cannot take the
 * older kinds' dedupe down with it.
 */
async function grantSentAt(email: string, kind: TrialEmailKind): Promise<Date | null> {
  const field = trialGrantSentField(kind);
  try {
    const grant = (await prisma.trialGrant.findUnique({
      where: { emailHash: trialGrantKey(email) },
      select: { [field]: true },
    })) as Partial<Record<TrialGrantSentField, Date | null>> | null;
    return grant?.[field] ?? null;
  } catch (error) {
    console.error('[cron trial-emails] TrialGrant read failed', error);
    return null;
  }
}

async function alreadySent(user: TrialCandidate, kind: TrialEmailKind): Promise<boolean> {
  return (
    hasReceivedTrialEmail(user.preferences?.actionChecks, kind) ||
    (await grantSentAt(user.email, kind)) !== null
  );
}

/**
 * The first due email this account has not received. `undefined` when
 * nothing is due; `null` when everything due has already gone out. Taking
 * only the first keeps "ended" ahead of "stopped" and a run apart from it.
 */
async function nextTrialEmail(
  user: TrialCandidate,
  trialEndsAt: Date,
  now: Date,
): Promise<TrialEmailKind | null | undefined> {
  const due = dueTrialEmails(trialEndsAt, now);
  if (due.length === 0) return undefined;
  for (const kind of due) {
    if (!(await alreadySent(user, kind))) return kind;
  }
  return null;
}

/**
 * "What made you stop?" is only honest for an account that did stop: any
 * balance, income, or expense edit or delete, or a logged payment since the
 * boundary means they are still using the plan on Free. Account creation is
 * not an edit: a delete-and-recreate mints a fresh createdAt after the
 * grant-anchored boundary without anyone touching the plan.
 */
function usedPlanSince(user: TrialCandidate, since: Date): boolean {
  const editedAt = getLatestPlanEditAt(user);
  return editedAt !== null && editedAt.getTime() > since.getTime();
}

interface TrialMessage {
  subject: string;
  element: React.ReactElement;
}

function buildTrialMessage(
  kind: TrialEmailKind,
  user: TrialCandidate,
  trialEndsAt: Date,
  now: Date,
  unsubscribeUrl: string,
): TrialMessage {
  const userName = user.name?.split(' ')[0] || undefined;

  if (kind === 'stopped') {
    return {
      subject: 'What made you stop?',
      element: React.createElement(TrialStoppedEmail, {
        userName,
        paymentsLogged: user._count.paymentRecords,
        unsubscribeUrl,
      }),
    };
  }

  const debts = openDebts(user);
  const common = {
    userName,
    debtCount: debts.length,
    monthlyPrice: PLANS.pro.price,
    keepProUrl: buildKeepProUrl(kind),
    unsubscribeUrl,
  };

  if (kind === 'ending') {
    const daysLeft = daysUntilTrialEnd(trialEndsAt, now);
    return {
      subject: `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} of free Pro left`,
      element: React.createElement(TrialEndingSoonEmail, {
        ...common,
        daysLeft,
        trialEndDate: formatTrialEndDate(trialEndsAt),
        interestAvoided: interestAvoidedFor(debts, user.income, user.expenses),
      }),
    };
  }

  // A send can trail the boundary by a day (cron cadence) or more
  // (retries), so only the boundary's own day says "today".
  const endedOn =
    daysSinceTrialEnd(trialEndsAt, now) === 0 ? 'today' : `on ${formatTrialEndDate(trialEndsAt)}`;
  return {
    subject: `Your free Pro ended ${endedOn}. Your plan did not.`,
    element: React.createElement(TrialEndedEmail, { ...common, endedOn }),
  };
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
  const recentWindowStart = trialCandidateCreatedAfter(now);
  const createdAfter = new Date(
    Math.max(SIGNUP_TRIAL_LAUNCH.getTime(), recentWindowStart.getTime()),
  );

  // Two arms rather than one OR: a single findMany can only order by one of the
  // two anchors, so a burst of signups could push every self-serve trial past
  // the cap (and vice versa). Each arm gets the full cap and is ordered by its
  // own anchor, so neither can starve the other.
  const [bySignup, byTrialStart] = await Promise.all([
    prisma.user.findMany({
      where: {
        AND: [
          { createdAt: { gte: createdAfter } },
          // `trialStartedAt: null` keeps the two arms disjoint, so each cap
          // covers its own population. An account can only hold a self-serve
          // start after it exists, so anything this excludes is inside the
          // other arm's window by construction and is picked up there.
          {
            OR: [
              { preferences: null },
              { preferences: { emailOptOut: false, trialStartedAt: null } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      // One past the cap: a run returning exactly the cap omitted nothing, and
      // the sentinel is what tells that apart from a truncated one.
      take: MAX_CANDIDATES_PER_RUN + 1,
      select: CANDIDATE_SELECT,
    }),
    // An older account whose own trial started recently enough to still be
    // inside a window. Its preferences row exists by definition, so the opt-out
    // check collapses into the same filter.
    prisma.user.findMany({
      where: {
        preferences: { trialStartedAt: { gte: recentWindowStart }, emailOptOut: false },
      },
      orderBy: { preferences: { trialStartedAt: 'asc' } },
      take: MAX_CANDIDATES_PER_RUN + 1,
      select: CANDIDATE_SELECT,
    }),
  ]);

  // An account created since launch that also started its own trial matches
  // both arms; keep it once. Oldest anchor first, so a capped run still sends
  // the mail closest to its boundary.
  const byId = new Map<string, TrialCandidate>();
  for (const user of [...bySignup, ...byTrialStart]) byId.set(user.id, user);
  const matched = [...byId.values()].sort((a, b) => trialAnchor(a) - trialAnchor(b));
  const candidates = matched.slice(0, MAX_CANDIDATES_PER_RUN);

  const results = {
    ok: true,
    candidates: candidates.length,
    ending: 0,
    ended: 0,
    stopped: 0,
    errors: 0,
    skippedOutsideWindow: 0,
    skippedPaid: 0,
    skippedPreviouslySent: 0,
    // Due for "stopped" but still using the plan on Free, so not asked.
    skippedActive: 0,
    // True whenever the scan did not see every account it should have: either
    // arm hit its own cap, or the merged set was sliced. Missing the second
    // case would hand back a clean all-clear for a run that skipped accounts.
    limited:
      bySignup.length > MAX_CANDIDATES_PER_RUN ||
      byTrialStart.length > MAX_CANDIDATES_PER_RUN ||
      matched.length > MAX_CANDIDATES_PER_RUN,
    messageVersion: TRIAL_EMAIL_VERSION,
  };

  for (const user of candidates) {
    if (results.ending + results.ended + results.stopped >= MAX_SENDS_PER_RUN) {
      results.limited = true;
      break;
    }

    try {
      // Grant-anchored (survives delete-and-recreate), same source of truth
      // the dashboard banner and checkout use.
      const trialEndsAt = await getSignupTrialEnd(user.id);
      if (!trialEndsAt) {
        results.skippedOutsideWindow++;
        continue;
      }
      const kind = await nextTrialEmail(user, trialEndsAt, now);
      if (kind === undefined) {
        results.skippedOutsideWindow++;
        continue;
      }
      if (kind === null) {
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
      // Still using the plan on Free: they did not stop, so do not ask. Mark
      // so the row is not re-evaluated; the 30-day win-back owns later idling.
      if (kind === 'stopped' && usedPlanSince(user, trialEndsAt)) {
        await recordSent(user.id, user.email, kind);
        results.skippedActive++;
        continue;
      }

      const unsubscribeUrl = `${APP_BASE_URL}/api/email/unsubscribe?userId=${user.id}&token=${generateUnsubscribeToken(user.id)}`;
      const { subject, element } = buildTrialMessage(kind, user, trialEndsAt, now, unsubscribeUrl);

      // Every trial email asks for a reply; the from address is a no-reply box.
      const result = await sendEmail(
        user.email,
        EMAIL_FROM,
        subject,
        await render(element),
        { idempotencyKey: `trial-${kind}-${TRIAL_EMAIL_VERSION}-${user.id}`, replyTo: SUPPORT_EMAIL },
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
