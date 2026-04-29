/**
 * POST /api/cron/weekly-digest
 *
 * Vercel cron — runs every Sunday at 9 AM UTC.
 * Sends a weekly recap to users who:
 *   - have emailDigest = true (default)
 *   - logged at least one payment in the past 7 days (DebtStory records)
 *
 * Processes 25 users per invocation. A cursor stored in Upstash KV
 * (key: "cron:weekly-digest:cursor") allows resuming across invocations
 * if the cron is triggered multiple times or to catch stragglers.
 * The cursor is written BEFORE emails are sent — crash-safe, may miss a
 * user on crash but never sends duplicates.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> header (set by Vercel cron).
 * Dev bypass: request accepted without auth when NODE_ENV === 'development'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { Redis } from '@upstash/redis';
import { prisma } from '@/lib/prisma';
import { generateDigestUnsubscribeToken } from '@/lib/unsubscribeToken';
import WeeklyDigestEmail from '@/emails/WeeklyDigestEmail';
import * as React from 'react';

const FROM    = 'SnowballPay <noreply@getsnowballpay.com>';
const BASE    = 'https://getsnowballpay.com';
const PAGE    = 25;
const CURSOR_KEY = 'cron:weekly-digest:cursor';

// ── KV helpers ────────────────────────────────────────────────────────────────

function makeRedis(): Redis | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function readCursor(redis: Redis | null): Promise<string | null> {
  if (!redis) return null;
  try { return await redis.get<string>(CURSOR_KEY); } catch { return null; }
}

async function writeCursor(redis: Redis | null, cursor: string | null): Promise<void> {
  if (!redis) return;
  try {
    if (cursor) {
      await redis.set(CURSOR_KEY, cursor, { ex: 7 * 24 * 60 * 60 }); // 7-day TTL
    } else {
      await redis.del(CURSOR_KEY);
    }
  } catch { /* non-blocking */ }
}

// ── Handler ───────────────────────────────────────────────────────────────────

const MILESTONE_PRIORITY: Record<string, number> = {
  debt_paid_off:     7,
  three_quarter:     6,
  half_paid:         5,
  quarter_paid:      4,
  anniversary:       3,
  streak_six_months: 2,
  first_payment:     1,
};

function bestMilestone(labels: Array<string | null>): string | null {
  let best: string | null = null;
  let bestScore = -1;
  for (const label of labels) {
    if (!label) continue;
    const score = MILESTONE_PRIORITY[label] ?? 0;
    if (score > bestScore) { best = label; bestScore = score; }
  }
  return best;
}

export async function POST(request: NextRequest) {
  // Auth
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev) {
    const secret = request.headers.get('authorization')?.replace('Bearer ', '');
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'email_not_configured' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const redis  = makeRedis();

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Read cursor
  const cursor = await readCursor(redis);

  // Fetch distinct userIds with DebtStory entries in the past 7 days,
  // scoped by emailDigest=true, with cursor pagination.
  const stories = await prisma.debtStory.findMany({
    where: {
      createdAt: { gte: since },
      ...(cursor ? { userId: { gt: cursor } } : {}),
    },
    select: {
      userId:        true,
      milestoneLabel: true,
      message:        true,
      amountPaid:     true,
      highlightStat:  true,
      createdAt:      true,
    },
    orderBy: [{ userId: 'asc' }, { createdAt: 'desc' }],
    take: PAGE * 20, // over-fetch; we'll group by userId
  });

  if (stories.length === 0) {
    await writeCursor(redis, null);
    return NextResponse.json({ sent: 0, reason: 'no_activity' });
  }

  // Group by userId, keeping first PAGE unique users
  type StoryEntry = (typeof stories)[number];
  const byUser = new Map<string, StoryEntry[]>();
  for (const s of stories) {
    if (!byUser.has(s.userId)) {
      if (byUser.size >= PAGE) break;
      byUser.set(s.userId, []);
    }
    byUser.get(s.userId)!.push(s);
  }

  const userIds = Array.from(byUser.keys());
  const lastUserId = userIds[userIds.length - 1];

  // Write cursor BEFORE sending (crash-safe: may skip but never duplicate)
  const hasMore = stories.length >= PAGE * 20 || byUser.size >= PAGE;
  await writeCursor(redis, hasMore ? lastUserId : null);

  // Fetch user records (email + name + emailDigest)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, emailDigest: true },
    select: { id: true, email: true, name: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    const entries = byUser.get(user.id) ?? [];
    if (entries.length === 0) { skipped++; continue; }

    const weeklyAmountPaid   = entries.reduce((s, e) => s + e.amountPaid, 0);
    const weeklyPaymentCount = entries.length;
    const milestone          = bestMilestone(entries.map((e) => e.milestoneLabel ?? null));
    const recentMessage      = entries[0]?.message;

    const unsubToken = generateDigestUnsubscribeToken(user.id);
    const unsubscribeUrl = `${BASE}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

    try {
      const html = await render(
        React.createElement(WeeklyDigestEmail, {
          userName:           user.name?.split(' ')[0] ?? 'there',
          weeklyPaymentCount,
          weeklyAmountPaid,
          bestMilestoneLabel: milestone,
          recentMessage,
          unsubscribeUrl,
        }),
      );

      await resend.emails.send({
        from:    FROM,
        to:      user.email,
        subject: 'Your debt week in review',
        html,
      });
      sent++;
    } catch (e) {
      console.error(`[weekly-digest] failed to send to ${user.id}:`, e);
      skipped++;
    }
  }

  return NextResponse.json({ sent, skipped, cursor: hasMore ? lastUserId : null });
}
