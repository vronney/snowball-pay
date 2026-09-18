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
 * below 7 overlaps the cron and can put "stopped" ahead of "ended"; the
 * script refuses to go below 3.
 *   - account has a signup window (post-launch signup or self-serve trial)
 *   - email allowed (not opted out)
 *   - not a paid Pro subscriber
 *   - not already sent (actionChecks flag OR the durable TrialGrant stamp)
 *   - no plan edit (debt / income / expense / payment / delete stamp)
 *     since the boundary — "stopped" must be true
 * Sends are capped at 50 per run, like the cron.
 *
 * Runs against the database in .env (use `npm run db:use:prod` first).
 * Dry run by default: prints the recipient table and sends nothing.
 *
 *   npx tsx scripts/backfill-stopped-email.ts                  # dry run
 *   npx tsx scripts/backfill-stopped-email.ts --send            # send to all eligible
 *   npx tsx scripts/backfill-stopped-email.ts --send --only a@x.com,b@y.com
 *   npx tsx scripts/backfill-stopped-email.ts --send --skip test@me.com
 *   npx tsx scripts/backfill-stopped-email.ts --min-days 3 --max-days 45
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

type Verdict = 'ELIGIBLE' | 'no window' | 'too recent' | 'too old' | 'paid pro' | 'already sent' | 'active since end' | 'lookup failed' | 'filtered' | 'send cap';

interface Row {
  id: string;
  email: string;
  name: string | null;
  /** Trial anchor for a grant row that has to be created: never "now". */
  trialAnchor: Date;
  trialEnd: string;
  daysSince: number;
  paymentsLogged: number;
  verdict: Verdict;
}

/**
 * Durable delivery record; survives delete-and-recreate. Fails closed: a
 * lookup error is 'failed', never "not sent", so the recipient is skipped.
 */
async function grantStoppedSentAt(email: string): Promise<{ sentAt: Date | null } | 'failed'> {
  try {
    const grant = await prisma.trialGrant.findUnique({
      where: { emailHash: trialGrantKey(email) },
      select: { stoppedEmailSentAt: true },
    });
    return { sentAt: grant?.stoppedEmailSentAt ?? null };
  } catch (error) {
    console.error('TrialGrant read failed', error instanceof Error ? error.message : String(error));
    return 'failed';
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
    const grant = await grantStoppedSentAt(user.email);
    if (grant === 'failed') { push('lookup failed'); continue; }
    if (grant.sentAt !== null) { push('already sent'); continue; }
    if (await hasPaidPro(user.id)) { push('paid pro'); continue; }

    const lookup = await readPlanEditedAt(user.id);
    if (!lookup.ok && lookup.reason === 'failed') { push('lookup failed'); continue; }
    const editedAt = getLatestPlanEditAt({ ...user, planEditedAt: lookup.ok ? lookup.planEditedAt : null });
    if (editedAt !== null && editedAt.getTime() >= trialEndsAt.getTime()) { push('active since end'); continue; }

    push(rows.filter((r) => r.verdict === 'ELIGIBLE').length >= MAX_SENDS_PER_RUN ? 'send cap' : 'ELIGIBLE');
  }

  console.table(rows.map((r) => ({ email: r.email, name: r.name ?? '', trialEnd: r.trialEnd, daysSince: r.daysSince, payments: r.paymentsLogged, verdict: r.verdict })));
  const eligible = rows.filter((r) => r.verdict === 'ELIGIBLE');
  console.log(`
${eligible.length} eligible of ${rows.length} scanned (window ${MIN_DAYS}-${MAX_DAYS} days since end). Mode: ${SEND ? 'SEND' : 'dry run'}`);
  if (!SEND) return;

  let sent = 0;
  let failed = 0;
  for (const r of eligible) {
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
    if (!result.success) {
      failed++;
      console.error(`FAILED ${r.email}: ${result.error}`);
      continue;
    }
    await markEmailSent(r.id, trialCheckKey(KIND));
    // Upsert: an account provisioned before grants existed has no row, and
    // the durable dedupe needs one. Anchor it to the account's own trial
    // start, never the default now(), which would reopen a Pro window.
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
      console.warn(
        `  (grant sent-at not recorded for user ${r.id}; actionChecks flag is set, cron will not resend)`,
        error instanceof Error ? error.message : String(error),
      );
    }
    sent++;
    console.log(`sent ${r.email} (${result.id})`);
  }
  console.log(`\nDone: ${sent} sent, ${failed} failed.`);
}

main()
  .catch((error: unknown) => {
    // Message only: a connection failure could otherwise echo the DATABASE_URL.
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
