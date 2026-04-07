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
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { prisma } from '@/lib/prisma';
import { generateUnsubscribeToken } from '@/lib/unsubscribeToken';
import MonthlyReviewEmail from '@/emails/MonthlyReviewEmail';
import {
  calculateDebtSnowball,
  calculateDebtAvalanche,
  calculateDebtCustom,
  type PayoffMethod,
} from '@/lib/snowball';
import * as React from 'react';

const FROM = 'SnowballPay <noreply@getsnowballpay.com>';
const BASE = 'https://getsnowballpay.com';

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'email_not_configured' });
  }

  const resend    = new Resend(process.env.RESEND_API_KEY);
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
        const method: PayoffMethod = (user.income.payoffMethod as PayoffMethod) || 'snowball';
        const calc = method === 'avalanche' ? calculateDebtAvalanche
          : method === 'custom'   ? calculateDebtCustom
          : calculateDebtSnowball;
        const plan = calc(
          user.debts as Parameters<typeof calc>[0],
          user.income.monthlyTakeHome,
          user.income.essentialExpenses,
          0,
          user.income.extraPayment ?? 0,
        );
        debtFreeDate = plan.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }

      const token          = generateUnsubscribeToken(user.id);
      const unsubscribeUrl = `${BASE}/api/email/unsubscribe?userId=${user.id}&token=${token}`;

      const html = await render(React.createElement(MonthlyReviewEmail, {
        userName:     user.name?.split(' ')[0] ?? undefined,
        totalBalance: Math.round(totalBalance),
        debtCount,
        debtFreeDate,
        monthName,
        unsubscribeUrl,
      }));

      await resend.emails.send({
        from:    FROM,
        to:      user.email,
        subject: `Your ${monthName} review reminder — SnowballPay`,
        html,
      });

      results.sent++;
    } catch (err) {
      console.error('[cron monthly-review]', user.id, err);
      results.errors++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
