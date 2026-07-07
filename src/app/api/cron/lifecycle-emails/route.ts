/**
 * GET /api/cron/lifecycle-emails
 *
 * Vercel cron job — runs daily.
 * Sends Day 2 (incomplete setup), Day 5 (first win), and Day 7 (share prompt)
 * lifecycle emails to users who qualify and haven't received them yet.
 *
 * Secured by CRON_SECRET env var (set in Vercel environment settings).
 */

import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { EMAIL_FROM, APP_BASE_URL } from '@/lib/constants/app';
import { generateUnsubscribeToken } from '@/lib/unsubscribeToken';
import PlanWaitingEmail from '@/emails/PlanWaitingEmail';
import {
  verifyCronRequest,
  sendEmail,
  markEmailSent,
  isEmailAlreadySent,
  handleMissingResendConfig,
} from '@/lib/services/emailService';
import { getDateRange, formatDateMonthYear } from '@/lib/utils/date';
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

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(handleMissingResendConfig());
  }

  const results = { day2: 0, day5: 0, day7: 0, leadReminder: 0, errors: 0 };

  // ── Day 2: users created 2 days ago who haven't set up yet ───────────────
  const { start: day2Start, end: day2End } = getDateRange(2);

  const day2Users = await prisma.user.findMany({
    where: {
      createdAt: { gte: day2Start, lte: day2End },
      OR: [{ preferences: null }, { preferences: { emailOptOut: false } }],
    },
    include: {
      preferences: true,
      debts: { select: { id: true } },
      income: { select: { id: true } },
    },
  });

  for (const user of day2Users) {
    try {
      if (await isEmailAlreadySent(user.id, 'lifecycle_day2_sent')) continue;

      const hasDebts  = user.debts.length > 0;
      const hasIncome = !!user.income;
      if (hasDebts && hasIncome) {
        await markEmailSent(user.id, 'lifecycle_day2_sent');
        continue; // setup complete, skip email but mark so we don't recheck
      }

      const html = await render(React.createElement(IncompleteSetupEmail, {
        userName: user.name?.split(' ')[0] ?? undefined,
        hasDebts,
        hasIncome,
      }));
      const result = await sendEmail(
        user.email,
        EMAIL_FROM,
        'Your debt payoff plan is 80% ready',
        html,
      );
      if (result.success) {
        await markEmailSent(user.id, 'lifecycle_day2_sent');
        results.day2++;
      } else {
        results.errors++;
      }
    } catch (err) {
      console.error('[cron day2]', user.id, err);
      results.errors++;
    }
  }

  // ── Day 5: users created 5 days ago who have a full plan ─────────────────
  const { start: day5Start, end: day5End } = getDateRange(5);

  const day5Users = await prisma.user.findMany({
    where: {
      createdAt: { gte: day5Start, lte: day5End },
      income:    { isNot: null },
      debts:     { some: {} },
      OR: [{ preferences: null }, { preferences: { emailOptOut: false } }],
    },
    include: {
      preferences: true,
      debts: { select: { id: true, balance: true, originalBalance: true, interestRate: true, minimumPayment: true, name: true, category: true, creditLimit: true, createdAt: true, updatedAt: true, userId: true, dueDate: true } },
      income: true,
    },
  });

  for (const user of day5Users) {
    try {
      if (await isEmailAlreadySent(user.id, 'lifecycle_day5_sent')) continue;
      if (!user.income) continue;

      const activeDebts = user.debts.filter((debt) => debt.balance > 0.01);
      if (activeDebts.length === 0) {
        await markEmailSent(user.id, 'lifecycle_day5_sent');
        continue;
      }

      const method: PayoffMethod = (user.income.payoffMethod as PayoffMethod) || 'snowball';
      const calc = method === 'avalanche' ? calculateDebtAvalanche
        : method === 'custom'   ? calculateDebtCustom
        : calculateDebtSnowball;

      const plan = calc(
        activeDebts as Parameters<typeof calc>[0],
        user.income.monthlyTakeHome,
        user.income.essentialExpenses,
        0,
        user.income.extraPayment ?? 0,
      );
      const minimumsOnly = calculateDebtSnowball(
        activeDebts as Parameters<typeof calculateDebtSnowball>[0],
        activeDebts.reduce((s, d) => s + d.minimumPayment, 0),
        0, 0, 0,
      );
      const saved = Math.max(0, minimumsOnly.totalInterestPaid - plan.totalInterestPaid);
      const debtFreeDate = formatDateMonthYear(plan.debtFreeDate);

      const html = await render(React.createElement(FirstWinEmail, {
        userName:           user.name?.split(' ')[0] ?? undefined,
        debtFreeDate,
        totalInterestSaved: Math.round(saved),
        debtCount:          activeDebts.length,
        monthlyPayment:     Math.round(plan.monthlyPayment),
      }));
      const result = await sendEmail(
        user.email,
        EMAIL_FROM,
        `You could be debt-free by ${debtFreeDate}`,
        html,
      );
      if (result.success) {
        await markEmailSent(user.id, 'lifecycle_day5_sent');
        results.day5++;
      } else {
        results.errors++;
      }
    } catch (err) {
      console.error('[cron day5]', user.id, err);
      results.errors++;
    }
  }

  // ── Day 7: users with a full plan who haven't shared yet ─────────────────
  const { start: day7Start, end: day7End } = getDateRange(7);

  const day7Users = await prisma.user.findMany({
    where: {
      createdAt: { gte: day7Start, lte: day7End },
      income:    { isNot: null },
      debts:     { some: {} },
      OR: [{ preferences: null }, { preferences: { emailOptOut: false } }],
    },
    include: {
      preferences: true,
      debts: { select: { id: true, balance: true, originalBalance: true, interestRate: true, minimumPayment: true, name: true, category: true, creditLimit: true, createdAt: true, updatedAt: true, userId: true, dueDate: true } },
      income: true,
    },
  });

  for (const user of day7Users) {
    try {
      if (await isEmailAlreadySent(user.id, 'lifecycle_day7_sent')) continue;
      if (!user.income) continue;

      const activeDebts = user.debts.filter((debt) => debt.balance > 0.01);
      if (activeDebts.length === 0) {
        await markEmailSent(user.id, 'lifecycle_day7_sent');
        continue;
      }

      const method: PayoffMethod = (user.income.payoffMethod as PayoffMethod) || 'snowball';
      const calc = method === 'avalanche' ? calculateDebtAvalanche
        : method === 'custom'   ? calculateDebtCustom
        : calculateDebtSnowball;

      const plan = calc(
        activeDebts as Parameters<typeof calc>[0],
        user.income.monthlyTakeHome,
        user.income.essentialExpenses,
        0,
        user.income.extraPayment ?? 0,
      );
      const minimumsOnly = calculateDebtSnowball(
        activeDebts as Parameters<typeof calculateDebtSnowball>[0],
        activeDebts.reduce((s, d) => s + d.minimumPayment, 0),
        0, 0, 0,
      );
      const interestSaved  = Math.max(0, minimumsOnly.totalInterestPaid - plan.totalInterestPaid);
      const totalDebt      = activeDebts.reduce((s, d) => s + d.balance, 0);
      const debtFreeDate   = formatDateMonthYear(plan.debtFreeDate);

      const html = await render(React.createElement(SharePromptEmail, {
        userName:         user.name?.split(' ')[0] ?? undefined,
        debtFreeDate,
        interestSaved:    Math.round(interestSaved),
        monthsRemaining:  plan.months,
        totalDebt:        Math.round(totalDebt),
      }));
      const result = await sendEmail(
        user.email,
        EMAIL_FROM,
        `Share your debt-free date — ${debtFreeDate}`,
        html,
      );
      if (result.success) {
        await markEmailSent(user.id, 'lifecycle_day7_sent');
        results.day7++;
      } else {
        results.errors++;
      }
    } catch (err) {
      console.error('[cron day7]', user.id, err);
      results.errors++;
    }
  }

  // ── Calculator leads: saved a plan 24h+ ago, never created an account ─────
  // One reminder per lead, ever (remindedAt guard). Leads that converted are
  // marked without sending so the backlog drains instead of being rechecked.
  const leadCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const leads = await prisma.calculatorLead.findMany({
    where: { remindedAt: null, createdAt: { lte: leadCutoff } },
    take: 100,
  });

  for (const lead of leads) {
    try {
      const converted = await prisma.user.findUnique({
        where: { email: lead.email },
        select: { id: true },
      });
      if (converted) {
        await prisma.calculatorLead.update({
          where: { id: lead.id },
          data: { remindedAt: new Date() },
        });
        continue;
      }

      // Lead unsubscribe deletes the row (no account to opt out) — token is
      // namespaced so a user token can never be replayed against a lead.
      const unsubscribeUrl = `${APP_BASE_URL}/api/email/unsubscribe?leadId=${lead.id}&token=${generateUnsubscribeToken(`lead:${lead.id}`)}`;
      const signupUrl = `${APP_BASE_URL}/auth/login?screen_hint=signup&login_hint=${encodeURIComponent(lead.email)}&returnTo=%2Fonboarding`;

      const html = await render(React.createElement(PlanWaitingEmail, {
        debtFreeDate:  lead.debtFreeDate ?? undefined,
        interestSaved: lead.interestSaved ?? undefined,
        signupUrl,
        unsubscribeUrl,
      }));
      const result = await sendEmail(
        lead.email,
        EMAIL_FROM,
        lead.debtFreeDate
          ? `Your debt-free date is waiting: ${lead.debtFreeDate}`
          : 'Your payoff plan is waiting',
        html,
      );
      if (result.success) {
        await prisma.calculatorLead.update({
          where: { id: lead.id },
          data: { remindedAt: new Date() },
        });
        results.leadReminder++;
      } else {
        results.errors++;
      }
    } catch (err) {
      console.error('[cron lead-reminder]', lead.id, err);
      results.errors++;
    }
  }

  // ── Snapshot retention: abandoned leads keep full debt/budget details in
  // planSnapshot. Successful onboarding clears it; for everyone else, purge
  // after 14 days — matching the localStorage draft TTL, and comfortably past
  // the 24h reminder window. The contact row itself stays for conversion
  // tracking; only the financial snapshot expires.
  let snapshotsPurged = 0;
  try {
    const snapshotCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const purged = await prisma.calculatorLead.updateMany({
      where: {
        createdAt: { lte: snapshotCutoff },
        NOT: { planSnapshot: { equals: Prisma.AnyNull } },
      },
      data: { planSnapshot: Prisma.DbNull },
    });
    snapshotsPurged = purged.count;
  } catch (err) {
    console.error('[cron snapshot-purge]', err);
    results.errors++;
  }

  return NextResponse.json({ ok: true, ...results, snapshotsPurged });
}
