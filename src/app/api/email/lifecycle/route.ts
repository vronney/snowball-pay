/**
 * POST /api/email/lifecycle
 *
 * Sends a specific lifecycle email for the authenticated user.
 * Guards against resending via actionChecks in UserPreferences.
 *
 * Body: { type: 'day0' | 'day2' | 'day5' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import WelcomeEmail from '@/emails/WelcomeEmail';
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

type LifecycleType = 'day0' | 'day2' | 'day5' | 'day7';

const LIFECYCLE_KEY: Record<LifecycleType, string> = {
  day0: 'lifecycle_day0_sent',
  day2: 'lifecycle_day2_sent',
  day5: 'lifecycle_day5_sent',
  day7: 'lifecycle_day7_sent',
};

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  let type: LifecycleType;
  try {
    const body = await request.json();
    if (!['day0', 'day2', 'day5', 'day7'].includes(body.type)) {
      return badRequest('Invalid lifecycle type');
    }
    type = body.type as LifecycleType;
  } catch {
    return badRequest('Invalid JSON');
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    include: {
      preferences: true,
      debts: { select: { id: true, balance: true, originalBalance: true, interestRate: true, minimumPayment: true, name: true, category: true, creditLimit: true, createdAt: true, updatedAt: true, userId: true, dueDate: true } },
      income: true,
    },
  });
  if (!user?.email) return unauthorized();

  // Check if already sent
  const checks = (user.preferences?.actionChecks ?? {}) as Record<string, boolean>;
  const key    = LIFECYCLE_KEY[type];
  if (checks[key]) {
    return NextResponse.json({ skipped: true, reason: 'already_sent' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'email_not_configured' });
  }

  try {
    let html = '';
    let subject = '';

    if (type === 'day0') {
      html    = await render(React.createElement(WelcomeEmail, { userName: user.name?.split(' ')[0] ?? undefined }));
      subject = 'Welcome to SnowballPay — here\'s your first move';
    }

    if (type === 'day2') {
      const hasDebts  = user.debts.length > 0;
      const hasIncome = !!user.income;
      if (hasDebts && hasIncome) {
        // Setup complete — no need for this email
        await markSent(user.id, user.preferences?.id, checks, key);
        return NextResponse.json({ skipped: true, reason: 'setup_complete' });
      }
      html    = await render(React.createElement(IncompleteSetupEmail, {
        userName: user.name?.split(' ')[0] ?? undefined,
        hasDebts,
        hasIncome,
      }));
      subject = 'Your debt payoff plan is 80% ready';
    }

    if (type === 'day5') {
      if (!user.income || user.debts.length === 0) {
        return NextResponse.json({ skipped: true, reason: 'no_plan' });
      }
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
      html    = await render(React.createElement(FirstWinEmail, {
        userName:           user.name?.split(' ')[0] ?? undefined,
        debtFreeDate:       plan.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        totalInterestSaved: Math.round(saved),
        debtCount:          user.debts.length,
        monthlyPayment:     Math.round(plan.monthlyPayment),
      }));
      subject = `You could be debt-free by ${plan.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }

    if (type === 'day7') {
      if (!user.income || user.debts.length === 0) {
        return NextResponse.json({ skipped: true, reason: 'no_plan' });
      }
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
      const interestSaved = Math.max(0, minimumsOnly.totalInterestPaid - plan.totalInterestPaid);
      const totalDebt     = user.debts.reduce((s, d) => s + d.balance, 0);
      html    = await render(React.createElement(SharePromptEmail, {
        userName:        user.name?.split(' ')[0] ?? undefined,
        debtFreeDate:    plan.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        interestSaved:   Math.round(interestSaved),
        monthsRemaining: plan.months,
        totalDebt:       Math.round(totalDebt),
      }));
      subject = `Share your debt-free date — ${plan.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }

    await resend.emails.send({ from: FROM, to: user.email, subject, html });
    await markSent(user.id, user.preferences?.id, checks, key);

    return NextResponse.json({ sent: true, type });
  } catch (err) {
    console.error('[lifecycle email]', err);
    return serverError('Failed to send lifecycle email');
  }
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
