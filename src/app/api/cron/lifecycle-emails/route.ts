/**
 * GET /api/cron/lifecycle-emails
 *
 * Vercel cron job — runs daily.
 * Sends Day 2 (incomplete setup) and Day 5 (first win) lifecycle emails
 * to users who qualify and haven't received them yet.
 *
 * Secured by CRON_SECRET env var (set in Vercel environment settings).
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { prisma } from '@/lib/prisma';
import IncompleteSetupEmail from '@/emails/IncompleteSetupEmail';
import FirstWinEmail from '@/emails/FirstWinEmail';
import SharePromptEmail from '@/emails/SharePromptEmail';
import {
  calculateDebtSnowball,
  calculateDebtAvalanche,
  calculateDebtCustom,
  type PayoffMethod,
} from '@/lib/snowball';
import * as React from 'react';

const FROM = 'SnowballPay <noreply@getsnowballpay.com>';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'email_not_configured' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const now    = new Date();
  const results = { day2: 0, day5: 0, day7: 0, errors: 0 };

  // ── Day 2: users created 2 days ago who haven't set up yet ───────────────
  const day2Start = new Date(now); day2Start.setDate(day2Start.getDate() - 2); day2Start.setHours(0, 0, 0, 0);
  const day2End   = new Date(now); day2End.setDate(day2End.getDate() - 2); day2End.setHours(23, 59, 59, 999);

  const day2Users = await prisma.user.findMany({
    where: { createdAt: { gte: day2Start, lte: day2End } },
    include: {
      preferences: true,
      debts: { select: { id: true } },
      income: { select: { id: true } },
    },
  });

  for (const user of day2Users) {
    try {
      const checks = (user.preferences?.actionChecks ?? {}) as Record<string, boolean>;
      if (checks['lifecycle_day2_sent']) continue;

      const hasDebts  = user.debts.length > 0;
      const hasIncome = !!user.income;
      if (hasDebts && hasIncome) {
        await markSent(user.id, user.preferences?.id, checks, 'lifecycle_day2_sent');
        continue; // setup complete, skip email but mark so we don't recheck
      }

      const html = await render(React.createElement(IncompleteSetupEmail, {
        userName: user.name?.split(' ')[0] ?? undefined,
        hasDebts,
        hasIncome,
      }));
      await resend.emails.send({
        from: FROM, to: user.email,
        subject: 'Your debt payoff plan is 80% ready',
        html,
      });
      await markSent(user.id, user.preferences?.id, checks, 'lifecycle_day2_sent');
      results.day2++;
    } catch (err) {
      console.error('[cron day2]', user.id, err);
      results.errors++;
    }
  }

  // ── Day 5: users created 5 days ago who have a full plan ─────────────────
  const day5Start = new Date(now); day5Start.setDate(day5Start.getDate() - 5); day5Start.setHours(0, 0, 0, 0);
  const day5End   = new Date(now); day5End.setDate(day5End.getDate() - 5); day5End.setHours(23, 59, 59, 999);

  const day5Users = await prisma.user.findMany({
    where: {
      createdAt: { gte: day5Start, lte: day5End },
      income: { isNot: null },
      debts: { some: {} },
    },
    include: {
      preferences: true,
      debts: { select: { id: true, balance: true, originalBalance: true, interestRate: true, minimumPayment: true, name: true, category: true, creditLimit: true, createdAt: true, updatedAt: true, userId: true, dueDate: true } },
      income: true,
    },
  });

  for (const user of day5Users) {
    try {
      const checks = (user.preferences?.actionChecks ?? {}) as Record<string, boolean>;
      if (checks['lifecycle_day5_sent'] || !user.income) continue;

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
      const minimumsOnly = calculateDebtSnowball(
        user.debts as Parameters<typeof calculateDebtSnowball>[0],
        user.debts.reduce((s, d) => s + d.minimumPayment, 0),
        0, 0, 0,
      );
      const saved = Math.max(0, minimumsOnly.totalInterestPaid - plan.totalInterestPaid);

      const html = await render(React.createElement(FirstWinEmail, {
        userName:           user.name?.split(' ')[0] ?? undefined,
        debtFreeDate:       plan.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        totalInterestSaved: Math.round(saved),
        debtCount:          user.debts.length,
        monthlyPayment:     Math.round(plan.monthlyPayment),
      }));
      await resend.emails.send({
        from: FROM, to: user.email,
        subject: `You could be debt-free by ${plan.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        html,
      });
      await markSent(user.id, user.preferences?.id, checks, 'lifecycle_day5_sent');
      results.day5++;
    } catch (err) {
      console.error('[cron day5]', user.id, err);
      results.errors++;
    }
  }

  // ── Day 7: users with a full plan who haven't shared yet ─────────────────
  const day7Start = new Date(now); day7Start.setDate(day7Start.getDate() - 7); day7Start.setHours(0, 0, 0, 0);
  const day7End   = new Date(now); day7End.setDate(day7End.getDate() - 7); day7End.setHours(23, 59, 59, 999);

  const day7Users = await prisma.user.findMany({
    where: {
      createdAt: { gte: day7Start, lte: day7End },
      income: { isNot: null },
      debts: { some: {} },
    },
    include: {
      preferences: true,
      debts: { select: { id: true, balance: true, originalBalance: true, interestRate: true, minimumPayment: true, name: true, category: true, creditLimit: true, createdAt: true, updatedAt: true, userId: true, dueDate: true } },
      income: true,
    },
  });

  for (const user of day7Users) {
    try {
      const checks = (user.preferences?.actionChecks ?? {}) as Record<string, boolean>;
      if (checks['lifecycle_day7_sent'] || !user.income) continue;

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
      const minimumsOnly = calculateDebtSnowball(
        user.debts as Parameters<typeof calculateDebtSnowball>[0],
        user.debts.reduce((s, d) => s + d.minimumPayment, 0),
        0, 0, 0,
      );
      const interestSaved  = Math.max(0, minimumsOnly.totalInterestPaid - plan.totalInterestPaid);
      const totalDebt      = user.debts.reduce((s, d) => s + d.balance, 0);

      const html = await render(React.createElement(SharePromptEmail, {
        userName:         user.name?.split(' ')[0] ?? undefined,
        debtFreeDate:     plan.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        interestSaved:    Math.round(interestSaved),
        monthsRemaining:  plan.months,
        totalDebt:        Math.round(totalDebt),
      }));
      await resend.emails.send({
        from: FROM, to: user.email,
        subject: `Share your debt-free date — ${plan.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        html,
      });
      await markSent(user.id, user.preferences?.id, checks, 'lifecycle_day7_sent');
      results.day7++;
    } catch (err) {
      console.error('[cron day7]', user.id, err);
      results.errors++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}

async function markSent(
  userId: string,
  prefId: string | undefined,
  existing: Record<string, boolean>,
  key: string,
) {
  const updated = { ...existing, [key]: true };
  if (prefId) {
    await prisma.userPreferences.update({ where: { id: prefId }, data: { actionChecks: updated } });
  } else {
    await prisma.userPreferences.create({ data: { userId, actionChecks: updated } });
  }
}
