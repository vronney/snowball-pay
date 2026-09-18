/**
 * scripts/backfill-stopped-email.ts
 *
 * One-off backfill of the "What made you stop?" trial email to accounts
 * whose free trial expired BEFORE the daily cron could reach them (the cron
 * only looks 3–7 days past the boundary; this feature shipped 2026-09-18).
 *
 * Mirrors the cron's own rules for the `stopped` kind, with a different
 * window: by default only trials the cron can no longer reach (ended 7+
 * days ago, --min-days) up to --max-days (default 90). Lowering --min-days
 * below 7 overlaps the cron; inside that overlap an account must already
 * have received "ended" (the cron's ordering), and the script refuses to
 * go below 3.
 *   - account has a signup window (post-launch signup or self-serve trial)
 *   - email allowed (not opted out)
 *   - not a paid Pro subscriber
 *   - not already sent (actionChecks flag OR the durable TrialGrant stamp)
 *   - no plan edit (debt / income / expense / payment / delete stamp)
 *     since the boundary — "stopped" must be true
 * Paid and still-active accounts are marked as consumed on --send, exactly
 * as the cron does, so a later state change does not make them eligible.
 * Sends are capped at 50 per run, like the cron. A grant lookup failure
 * skips the row (fail closed; re-run later) rather than falling back to
 * the preferences flag as the cron does: a manual run can be repeated, a
 * duplicate email cannot be recalled.
 *
 * Runs against the database in .env (use `npm run db:use:prod` first).
 * Dry run by default: prints the recipient table and sends nothing.
 *
 *   npm run backfill:stopped-email                          # dry run
 *   npm run backfill:stopped-email -- --send                # send to all eligible
 *   npm run backfill:stopped-email -- --send --only a@x.com,b@y.com
 *   npm run backfill:stopped-email -- --send --skip test@me.com
 *   npm run backfill:stopped-email -- --min-days 3 --max-days 45
 *
 * Delivery is recorded on UserPreferences.actionChecks exactly like the cron,
 * so the cron will never resend, and on the durable TrialGrant row so a
 * delete-and-recreate cannot be re-sent. That row is keyed with
 * TRIAL_GRANT_SECRET, so --send requires it (dry runs only warn); a grant
 * lookup that fails for any reason skips the recipient rather than
 * treating them as unsent.
 */
import 'dotenv/config';
import './neon-ws';
import { render } from '@react-email/render';
import * as React from 'react';
import { prisma } from '@/lib/prisma';
import { EMAIL_FROM, APP_BASE_URL, SUPPORT_EMAIL } from '@/lib/constants/app';
import { markEmailSent, sendEmail } from '@/lib/services/emailService';
import { getSignupTrialEnd, hasPaidPro } from '@/lib/gates';
import { POST_TRIAL_PROMPT_DAYS, SIGNUP_TRIAL_LAUNCH } from '@/lib/billing';
import {
  TRIAL_EMAIL_VERSION,
  TRIAL_STOPPED_MIN_DAYS,
  daysSinceTrialEnd,
  hasReceivedTrialEmail,
  trialCheckKey,
  trialGrantSentField,
} from '@/lib/lifecycleTrial';
import { getLatestPlanEditAt } from '@/lib/lifecycleWinBack';
import { readPlanEditedAt } from '@/lib/planEdits';
import { trialGrantKey } from '@/lib/trialGrantKey';
import { generateUnsubscribeToken } from '@/lib/unsubscribeToken';
import TrialStoppedEmail from '@/emails/TrialStoppedEmail';

const KIND = 'stopped' as const;
const MAX_SENDS_PER_RUN = 50;

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const SEND = process.argv.includes('--send');

function days(flag: string, fallback: number): number {
  const raw = arg(flag);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    console.error(`${flag} must be a non-negative whole number, got "${raw}"`);
    process.exit(1);
  }
  return n;
}
const MIN_DAYS = Math.max(TRIAL_STOPPED_MIN_DAYS, days('--min-days', POST_TRIAL_PROMPT_DAYS));
const MAX_DAYS = days('--max-days', 90);
if (MAX_DAYS < MIN_DAYS) {
  console.error(`--max-days (${MAX_DAYS}) is below --min-days (${MIN_DAYS})`);
  process.exit(1);
}
/**
 * Comma-separated email list. Empty only when the flag is absent: a flag
 * with no value (last token, or followed by another flag) is an error, so
 * a typo can never widen a --send to everyone.
 */
function emailSet(flag: string): Set<string> {
  const index = process.argv.indexOf(flag);
  if (index < 0) return new Set();
  const raw = process.argv[index + 1];
  if (raw === undefined || raw.startsWith('-')) {
    console.error(`${flag} requires a comma-separated email list`);
    process.exit(1);
  }
  const values = raw.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (values.length === 0) {
    console.error(`${flag} requires a comma-separated email list`);
    process.exit(1);
  }
  return new Set(values);
}
const ONLY = emailSet('--only');
const SKIP = emailSet('--skip');

type Verdict =
  | 'ELIGIBLE' | 'no window' | 'too recent' | 'too old' | 'paid pro' | 'already sent'
  | 'active since end' | 'ended not sent yet' | 'lookup failed' | 'filtered' | 'send cap';

interface Row {
  id: string;
  email: string;
  name: string | null;
  /**
   * Trial anchor for a grant row that has to be created (accounts provisioned
   * before grants existed have none): the account's own trial start, never
   * the default now(), which would reopen a Pro window.
   */
  trialAnchor: Date;
  trialEnd: string;
  daysSince: number;
  paymentsLogged: number;
  verdict: Verdict;
}

interface GrantSent {
  ended: Date | null;
  stopped: Date | null;
}

/**
 * Durable delivery record; survives delete-and-recreate. Fails closed: a
 * lookup error is 'failed', never "not sent", so the recipient is skipped.
 */
async function grantSent(email: string): Promise<GrantSent | 'failed'> {
  try {
    const grant = await prisma.trialGrant.findUnique({
      where: { emailHash: trialGrantKey(email) },
      select: { endedEmailSentAt: true, stoppedEmailSentAt: true },
    });
    return { ended: grant?.endedEmailSentAt ?? null, stopped: grant?.stoppedEmailSentAt ?? null };
  } catch (error) {
    console.error('TrialGrant read failed', error instanceof Error ? error.message : String(error));
    return 'failed';
  }
}

/** Consumption writes that failed (paid/active rows we could not mark). Reported at exit. */
let consumeFailures = 0;

/**
 * Mark the stopped kind consumed, as the cron does for paid/active rows.
 * Send mode only. A failure is logged and counted; the scan continues.
 */
async function consumeStopped(userId: string): Promise<void> {
  if (!SEND) return;
  try {
    await markEmailSent(userId, trialCheckKey(KIND));
  } catch (error) {
    consumeFailures++;
    console.error(`  consumption NOT recorded for user ${userId}:`, error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  if (SEND && !process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set; refusing to --send.');
    process.exit(1);
  }
  // Without the production secret, grant hashes cannot match production
  // rows: the durable dedupe would silently pass and the sent-at write
  // would miss. Dry runs may proceed (the grant column just reads as unset).
  if (!process.env.TRIAL_GRANT_SECRET) {
    if (SEND) {
      console.error('TRIAL_GRANT_SECRET is not set; refusing to --send (durable dedupe would not match production).');
      process.exit(1);
    }
    console.warn('TRIAL_GRANT_SECRET is not set: the TrialGrant dedupe column is not checked in this dry run.');
  }
  const now = new Date();

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { createdAt: { gte: SIGNUP_TRIAL_LAUNCH } },
        { preferences: { trialStartedAt: { not: null } } },
      ],
      AND: [{ OR: [{ preferences: null }, { preferences: { emailOptOut: false } }] }],
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      preferences: { select: { actionChecks: true, trialStartedAt: true } },
      debts: { select: { updatedAt: true } },
      income: { select: { updatedAt: true } },
      expenses: { select: { updatedAt: true } },
      paymentRecords: { orderBy: { paidAt: 'desc' }, take: 1, select: { paidAt: true } },
      _count: { select: { paymentRecords: true } },
    },
  });

  const rows: Row[] = [];
  for (const user of users) {
    const email = user.email.toLowerCase();
    const base = {
      id: user.id,
      email: user.email,
      name: user.name,
      // Same anchor resolveSignupTrialEnd falls back to when no grant exists.
      trialAnchor: user.preferences?.trialStartedAt ?? user.createdAt,
      paymentsLogged: user._count.paymentRecords,
    };
    const trialEndsAt = await getSignupTrialEnd(user.id);
    if (!trialEndsAt) {
      rows.push({ ...base, trialEnd: '-', daysSince: 0, verdict: 'no window' });
      continue;
    }
    const daysSince = daysSinceTrialEnd(trialEndsAt, now);
    const trialEnd = trialEndsAt.toISOString().slice(0, 10);
    const push = (verdict: Verdict) => rows.push({ ...base, trialEnd, daysSince, verdict });

    if (trialEndsAt.getTime() > now.getTime() || daysSince < MIN_DAYS) { push('too recent'); continue; }
    if (daysSince > MAX_DAYS) { push('too old'); continue; }
    if ((ONLY.size > 0 && !ONLY.has(email)) || SKIP.has(email)) { push('filtered'); continue; }
    if (hasReceivedTrialEmail(user.preferences?.actionChecks, KIND)) { push('already sent'); continue; }
    const grant = await grantSent(user.email);
    if (grant === 'failed') { push('lookup failed'); continue; }
    if (grant.stopped !== null) { push('already sent'); continue; }
    // Inside the cron's own window, "ended" must have gone out first: the
    // cron would otherwise send it after this, reversing the sequence.
    // Past that window the cron never sends "ended", so no ordering exists.
    if (
      daysSince < POST_TRIAL_PROMPT_DAYS &&
      !hasReceivedTrialEmail(user.preferences?.actionChecks, 'ended') &&
      grant.ended === null
    ) { push('ended not sent yet'); continue; }
    if (await hasPaidPro(user.id)) { await consumeStopped(user.id); push('paid pro'); continue; }

    const lookup = await readPlanEditedAt(user.id);
    if (!lookup.ok && lookup.reason === 'failed') { push('lookup failed'); continue; }
    const editedAt = getLatestPlanEditAt({ ...user, planEditedAt: lookup.ok ? lookup.planEditedAt : null });
    if (editedAt !== null && editedAt.getTime() >= trialEndsAt.getTime()) {
      await consumeStopped(user.id);
      push('active since end');
      continue;
    }

    push(rows.filter((r) => r.verdict === 'ELIGIBLE').length >= MAX_SENDS_PER_RUN ? 'send cap' : 'ELIGIBLE');
  }

  console.table(rows.map((r) => ({ email: r.email, name: r.name ?? '', trialEnd: r.trialEnd, daysSince: r.daysSince, payments: r.paymentsLogged, verdict: r.verdict })));
  const eligible = rows.filter((r) => r.verdict === 'ELIGIBLE');
  console.log(`
${eligible.length} eligible of ${rows.length} scanned (window ${MIN_DAYS}-${MAX_DAYS} days since end). Mode: ${SEND ? 'SEND' : 'dry run'}`);
  if (!SEND) return;

  let sent = 0;
  let failed = 0;
  let unrecorded = 0;
  for (const r of eligible) {
    let deliveryId: string;
    try {
      deliveryId = await sendOne(r);
    } catch (error) {
      // A render or send failure for one account must not stop the rest.
      failed++;
      console.error(`FAILED user ${r.id}:`, error instanceof Error ? error.message : String(error));
      continue;
    }
    sent++;
    console.log(`sent ${r.email} (${deliveryId})`);
    // The email is out either way; a failed record is its own problem
    // (the row would look eligible again) and must be reported as such.
    if (!(await recordSent(r))) unrecorded++;
  }
  console.log(
    `\nDone: ${sent} sent, ${failed} failed, ${unrecorded} sent but not fully recorded, ` +
      `${consumeFailures} paid/active rows not marked.`,
  );
  // Any failure is a non-zero exit: automation must not read a partial run
  // as success, and an unrecorded send would be re-sent by the next run.
  if (unrecorded > 0) {
    console.error('Fix the recording failures above before re-running, or those accounts will be re-sent.');
  }
  if (failed > 0 || unrecorded > 0 || consumeFailures > 0) process.exitCode = 1;
}

/**
 * Record delivery: the durable grant stamp first (survives delete-and-
 * recreate), then the preferences flag the cron checks first. Each write
 * is independent; a failure is logged and reported, never thrown.
 * Returns true only when both landed.
 */
async function recordSent(r: Row): Promise<boolean> {
  let ok = true;
  const sentAt = new Date();
  try {
    await prisma.trialGrant.upsert({
      where: { emailHash: trialGrantKey(r.email) },
      update: { [trialGrantSentField(KIND)]: sentAt },
      create: {
        emailHash: trialGrantKey(r.email),
        grantedAt: r.trialAnchor,
        [trialGrantSentField(KIND)]: sentAt,
      },
    });
  } catch (error) {
    ok = false;
    console.error(`  grant sent-at NOT recorded for user ${r.id}:`, error instanceof Error ? error.message : String(error));
  }
  try {
    await markEmailSent(r.id, trialCheckKey(KIND));
  } catch (error) {
    ok = false;
    console.error(`  preferences flag NOT recorded for user ${r.id}:`, error instanceof Error ? error.message : String(error));
  }
  return ok;
}

/** Render and send one recipient. Returns the provider delivery id; throws on any failure. */
async function sendOne(r: Row): Promise<string> {
  {
    const unsubscribeUrl = `${APP_BASE_URL}/api/email/unsubscribe?userId=${r.id}&token=${generateUnsubscribeToken(r.id)}`;
    const html = await render(
      React.createElement(TrialStoppedEmail, {
        userName: r.name?.split(' ')[0] || undefined,
        paymentsLogged: r.paymentsLogged,
        unsubscribeUrl,
      }),
    );
    const result = await sendEmail(r.email, EMAIL_FROM, 'What made you stop?', html, {
      idempotencyKey: `trial-${KIND}-${TRIAL_EMAIL_VERSION}-${r.id}`,
      replyTo: SUPPORT_EMAIL,
    });
    if (!result.success) throw new Error(result.error ?? 'send failed');
    return result.id ?? 'no-id';
  }
}

main()
  .catch((error: unknown) => {
    // Message only: a connection failure could otherwise echo the DATABASE_URL.
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
