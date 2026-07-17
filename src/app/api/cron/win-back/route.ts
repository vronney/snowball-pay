/**
 * GET /api/cron/win-back
 *
 * Daily, one-time re-engagement for activated users whose saved plan has not
 * recorded a balance/income update or payment for at least 30 days.
 *
 * Entry: outstanding debt, account at least 30 days old, email allowed.
 * Exit: recent durable plan activity or the supportive_v1 email was delivered.
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
import {
  WIN_BACK_CHECK_KEY,
  WIN_BACK_INACTIVE_DAYS,
  WIN_BACK_MESSAGE_VERSION,
  getLatestPlanActivityAt,
  hasReceivedWinBack,
  isInactiveForWinBack,
} from '@/lib/lifecycleWinBack';
import WinBackEmail from '@/emails/WinBackEmail';
import { generateUnsubscribeToken } from '@/lib/unsubscribeToken';

const MAX_SENDS_PER_RUN = 50;

function buildDashboardUrl(): string {
  const url = new URL('/dashboard', APP_BASE_URL);
  url.searchParams.set('utm_source', 'lifecycle');
  url.searchParams.set('utm_medium', 'email');
  url.searchParams.set('utm_campaign', 'win_back');
  url.searchParams.set('utm_content', WIN_BACK_MESSAGE_VERSION);
  return url.toString();
}

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  if (!process.env.RESEND_API_KEY) return handleMissingResendConfig();

  const now = new Date();
  const accountAgeCutoff = new Date(now.getTime() - WIN_BACK_INACTIVE_DAYS * 24 * 60 * 60 * 1000);
  const candidates = await prisma.user.findMany({
    where: {
      createdAt: { lte: accountAgeCutoff },
      debts: { some: { balance: { gt: 0 } } },
      OR: [{ preferences: null }, { preferences: { emailOptOut: false } }],
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      preferences: { select: { actionChecks: true } },
      debts: {
        where: { balance: { gt: 0 } },
        select: { updatedAt: true },
      },
      income: { select: { updatedAt: true } },
      paymentRecords: {
        orderBy: { paidAt: 'desc' },
        select: { paidAt: true },
        take: 1,
      },
    },
  });

  let sent = 0;
  let errors = 0;
  let skippedRecent = 0;
  let skippedPreviouslySent = 0;
  let limited = false;

  for (const user of candidates) {
    if (sent >= MAX_SENDS_PER_RUN) {
      limited = true;
      break;
    }

    if (hasReceivedWinBack(user.preferences?.actionChecks)) {
      skippedPreviouslySent++;
      continue;
    }

    const activityAt = getLatestPlanActivityAt(user);
    if (!isInactiveForWinBack(activityAt, now)) {
      skippedRecent++;
      continue;
    }

    try {
      const token = generateUnsubscribeToken(user.id);
      const unsubscribeUrl = `${APP_BASE_URL}/api/email/unsubscribe?userId=${user.id}&token=${token}`;
      const dashboardUrl = buildDashboardUrl();
      const html = await render(
        React.createElement(WinBackEmail, {
          userName: user.name?.split(' ')[0] ?? undefined,
          dashboardUrl,
          unsubscribeUrl,
        }),
      );

      const result = await sendEmail(
        user.email,
        EMAIL_FROM,
        'Your payoff plan is ready when you are',
        html,
        { idempotencyKey: `win-back-${WIN_BACK_MESSAGE_VERSION}-${user.id}` },
      );
      if (!result.success) throw new Error(result.error);

      await markEmailSent(user.id, WIN_BACK_CHECK_KEY);
      sent++;
    } catch (error) {
      console.error('[cron win-back]', user.id, error);
      errors++;
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    sent,
    errors,
    skippedRecent,
    skippedPreviouslySent,
    limited,
    messageVersion: WIN_BACK_MESSAGE_VERSION,
  });
}
