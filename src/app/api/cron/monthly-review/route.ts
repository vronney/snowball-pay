/**
 * GET /api/cron/monthly-review
 *
 * Vercel cron — runs on the 1st of each month at 9 AM UTC.
 * Sends monthly review reminder emails to users who opted in
 * (actionChecks.monthlyReview === true) and haven't opted out.
 *
 * Secured by CRON_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { prisma } from '@/lib/prisma';
import { EMAIL_FROM, APP_BASE_URL } from '@/lib/constants/app';
import {
  verifyCronRequest,
  sendEmail,
  handleMissingResendConfig,
} from '@/lib/services/emailService';
import { generateUnsubscribeToken } from '@/lib/unsubscribeToken';
import MonthlyReviewEmail from '@/emails/MonthlyReviewEmail';
import { calculateResultByMethod, methodFromIncome } from '@/lib/payoffPlan';
import type { Debt } from '@/types';
import * as React from 'react';

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  if (!process.env.RESEND_API_KEY) {
    return handleMissingResendConfig();
  }
  const now       = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const results   = { sent: 0, skipped: 0, errors: 0 };

  const users = await prisma.user.findMany({
    where: {
      income: { isNot: null },
      debts:  { some: {} },
      OR: [{ preferences: null }, { preferences: { emailOptOut: false } }],
    },
    include: {
      preferences: true,
      debts: {
        select: {
          id: true, balance: true, originalBalance: true,
          interestRate: true, minimumPayment: true, name: true,
          category: true, creditLimit: true, createdAt: true,
          updatedAt: true, userId: true, dueDate: true,
        },
      },
      income: true,
    },
  });

  for (const user of users) {
    try {
      const checks = (user.preferences?.actionChecks ?? {}) as Record<string, boolean>;
      if (!checks['monthlyReview']) { results.skipped++; continue; }

      const totalBalance = user.debts.reduce((s, d) => s + d.balance, 0);
      const debtCount    = user.debts.length;

      let debtFreeDate: string | undefined;
      if (user.income) {
        const plan = calculateResultByMethod(
          user.debts as Debt[],
          user.income,
          0,
          user.income.extraPayment ?? 0,
          methodFromIncome(user.income),
        );
        debtFreeDate = plan.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }

      const token          = generateUnsubscribeToken(user.id);
      const unsubscribeUrl = `${APP_BASE_URL}/api/email/unsubscribe?userId=${user.id}&token=${token}`;

      const html = await render(React.createElement(MonthlyReviewEmail, {
        userName:     user.name?.split(' ')[0] ?? undefined,
        totalBalance: Math.round(totalBalance),
        debtCount,
        debtFreeDate,
        monthName,
        unsubscribeUrl,
      }));

      const result = await sendEmail(
        user.email,
        EMAIL_FROM,
        `Your ${monthName} review reminder — SnowballPay`,
        html,
      );
      if (result.success) results.sent++;
    } catch (err) {
      console.error('[cron monthly-review]', user.id, err);
      results.errors++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
