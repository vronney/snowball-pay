import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import { rateLimit } from '@/lib/rateLimit';
import { PayoffPlanEmail } from '@/emails/PayoffPlanEmail';
import {
  calculateDebtSnowball,
  calculateDebtAvalanche,
  calculateDebtCustom,
} from '@/lib/snowball';
import * as React from 'react';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user.email) return unauthorized();

  // 1 email per user per 10 minutes
  if (!rateLimit(`email-plan:${auth.user.id}`, 1, 10 * 60 * 1000)) {
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

    const essential = income.essentialExpenses ?? 0;
    const recurring = expenses.reduce((s, e) => s + e.amount, 0);
    const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);
    const naturalSurplus = Math.max(
      0,
      income.monthlyTakeHome - essential - recurring - totalMin,
    );
    const maxAccel = naturalSurplus + (income.extraPayment ?? 0);
    const targetAccel =
      income.accelerationAmount != null
        ? Math.min(income.accelerationAmount, maxAccel)
        : maxAccel;
    const adjustedExtra = targetAccel - naturalSurplus;

    const method = income.payoffMethod ?? 'snowball';
    const calc =
      method === 'avalanche'
        ? calculateDebtAvalanche
        : method === 'custom'
          ? calculateDebtCustom
          : calculateDebtSnowball;

    const result = calc(
      debts as import('@/types').Debt[],
      income.monthlyTakeHome,
      essential,
      recurring,
      adjustedExtra,
    );

    const html = await render(
      React.createElement(PayoffPlanEmail, {
        userName: user?.name ?? undefined,
        totalDebt: debts.reduce((s, d) => s + d.balance, 0),
        totalInterestPaid: result.totalInterestPaid,
        monthlyPayment: result.monthlyPayment,
        debtFreeDate: result.debtFreeDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        }),
        payoffSchedule: result.payoffSchedule,
        method,
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
