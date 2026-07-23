import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import { isPro, upgradeRequired } from '@/lib/gates';
import { limits } from '@/lib/rateLimit';
import { PayoffPlanEmail } from '@/emails/PayoffPlanEmail';
import { fetchEmailContent } from '@/lib/emailContent';
import { calculatePlanMetrics } from '@/lib/payoffPlan';
import type { Debt } from '@/types';
import * as React from 'react';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user.email) return unauthorized();

  // Plan export/email is a listed Pro feature. No UI currently calls this
  // route, but it remains directly invocable — gate it like calendar export.
  if (!(await isPro(auth.user.id))) return upgradeRequired('Export payoff plan');

  // 1 email per user per 10 minutes
  if (!(await limits.emailPlan(auth.user.id))) {
    return NextResponse.json(
      { error: 'Please wait before sending again' },
      { status: 429 },
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const [debts, income, expenses, user] = await Promise.all([
      prisma.debt.findMany({ where: { userId: auth.user.id } }),
      prisma.income.findUnique({ where: { userId: auth.user.id } }),
      prisma.expense.findMany({ where: { userId: auth.user.id } }),
      prisma.user.findUnique({
        where: { id: auth.user.id },
        select: { name: true },
      }),
    ]);

    if (debts.length === 0) return badRequest('No debts found');
    if (!income) return badRequest('Income not configured');

    const normalizedDebts: Debt[] = debts.map((debt: (typeof debts)[number]) => ({
      ...debt,
      category: debt.category as Debt['category'],
      dueDate: debt.dueDate ?? undefined,
    }));
    const metrics = calculatePlanMetrics(normalizedDebts, income, expenses);
    if (!metrics) return badRequest('No payoff plan available');

    const result = metrics.result;
    const method = metrics.method;

    const featuredContent = await fetchEmailContent();

    const html = await render(
      React.createElement(PayoffPlanEmail, {
        userName: user?.name ?? undefined,
        totalDebt: normalizedDebts.reduce((s, d) => s + d.balance, 0),
        totalInterestPaid: result.totalInterestPaid,
        monthlyPayment: result.monthlyPayment,
        debtFreeDate: result.debtFreeDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        }),
        payoffSchedule: result.payoffSchedule,
        method,
        featuredContent,
      }),
    );

    await resend.emails.send({
      from: 'SnowballPay <noreply@getsnowballpay.com>',
      to: auth.user.email,
      subject: `Your Debt Payoff Plan — Debt-Free by ${result.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      html,
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('Email send error:', error);
    return serverError('Failed to send email');
  }
}
