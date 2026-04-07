/**
 * GET /api/cron/win-back
 *
 * Vercel cron job — runs daily.
 * Targets users who:
 *   - Have debts set up (activated users)
 *   - Have had no payment records in the last 30 days
 *   - Were created more than 30 days ago (not brand new)
 *   - Have not opted out of email
 *   - Have not already received a win-back email in the last 30 days
 *
 * Secured by CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { prisma } from '@/lib/prisma';
import WinBackEmail from '@/emails/WinBackEmail';
import { generateUnsubscribeToken } from '@/lib/unsubscribeToken';
import * as React from 'react';

const FROM       = 'SnowballPay <noreply@getsnowballpay.com>';
const BASE_URL   = 'https://getsnowballpay.com';
const INACTIVE_DAYS = 30;
const RESEND_COOLDOWN_DAYS = 30; // don't re-send within 30 days

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'email_not_configured' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const now    = new Date();

  // Cutoff dates
  const inactiveCutoff  = new Date(now);
  inactiveCutoff.setDate(inactiveCutoff.getDate() - INACTIVE_DAYS);

  const accountAgeCutoff = new Date(now);
  accountAgeCutoff.setDate(accountAgeCutoff.getDate() - INACTIVE_DAYS);

  // Find activated users old enough to be win-back candidates
  const candidates = await prisma.user.findMany({
    where: {
      createdAt: { lte: accountAgeCutoff },
      debts:     { some: {} },
      OR: [{ preferences: null }, { preferences: { emailOptOut: false } }],
    },
    include: {
      preferences: true,
      debts:  { select: { id: true, balance: true } },
      income: { select: { monthlyTakeHome: true } },
      payoffPlan: { select: { debtFreeDate: true } },
      paymentRecords: {
        where:   { paidAt: { gte: inactiveCutoff } },
        select:  { id: true },
        take:    1,
      },
    },
  });

  let sent = 0;
  let errors = 0;

  for (const user of candidates) {
    try {
      // Skip if they have a recent payment (not inactive)
      if (user.paymentRecords.length > 0) continue;

      const checks = (user.preferences?.actionChecks ?? {}) as Record<string, unknown>;

      // Skip if win-back was sent within the cooldown window
      const sentAt = typeof checks['winback_sent_at'] === 'string' ? checks['winback_sent_at'] : undefined;
      if (sentAt) {
        const daysSince = (now.getTime() - new Date(sentAt).getTime()) / 86400000;
        if (daysSince < RESEND_COOLDOWN_DAYS) continue;
      }

      const totalBalance = user.debts.reduce((s, d) => s + d.balance, 0);
      if (totalBalance <= 0) continue; // all debts paid off — not a win-back candidate

      // Days since account creation as a conservative activity proxy
      const daysSinceActivity = Math.round(
        (now.getTime() - user.createdAt.getTime()) / 86400000,
      );

      const debtFreeDate = user.payoffPlan?.debtFreeDate
        ? user.payoffPlan.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : undefined;

      const token = generateUnsubscribeToken(user.id);
      const unsubscribeUrl = `${BASE_URL}/api/email/unsubscribe?userId=${user.id}&token=${token}`;

      const html = await render(
        React.createElement(WinBackEmail, {
          userName:          user.name?.split(' ')[0] ?? undefined,
          totalBalance,
          debtFreeDate,
          daysSinceActivity: Math.min(daysSinceActivity, 90), // cap display at 90
          unsubscribeUrl,
        }),
      );

      await resend.emails.send({
        from: FROM,
        to:   user.email,
        subject: 'Your debt payoff plan is waiting — come back',
        html,
      });

      // Record send timestamp in actionChecks
      const updated = { ...checks, winback_sent_at: now.toISOString() };
      if (user.preferences?.id) {
        await prisma.userPreferences.update({
          where: { id: user.preferences.id },
          data:  { actionChecks: updated },
        });
      } else {
        await prisma.userPreferences.create({
          data: { userId: user.id, actionChecks: updated },
        });
      }

      sent++;
    } catch (err) {
      console.error('[cron win-back]', user.id, err);
      errors++;
    }
  }

  return NextResponse.json({ ok: true, sent, errors });
}
