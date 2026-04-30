/**
 * GET /api/cron/due-date-reminder
 *
 * Vercel cron — runs daily at 8 AM UTC.
 * Sends one email per user listing all debts due in 3 days that have not
 * yet been logged for that billing month.
 *
 * Eligibility per debt:
 *   - dueDate (day-of-month) matches today + 3 days
 *   - No PaymentRecord exists for that debt in the target billing month
 *   - UserPreferences.notifyDueDates = true (default when no prefs row)
 *   - UserPreferences.emailOptOut   = false (default when no prefs row)
 *
 * Short-month edge case: if the target day is the last day of the target
 * month, also match debts whose dueDate exceeds that day (e.g. dueDate=31
 * in a 30-day month fires on the 30th).
 *
 * Streak: consecutive months where the user logged at least one payment,
 * ending the month before the due month.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> header (set by Vercel cron).
 * Dev bypass: accepted without auth when NODE_ENV === 'development'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { prisma } from '@/lib/prisma';
import { generateDigestUnsubscribeToken } from '@/lib/unsubscribeToken';
import DueDateReminderEmail from '@/emails/DueDateReminderEmail';
import * as React from 'react';

const FROM            = 'SnowballPay <noreply@getsnowballpay.com>';
const BASE            = 'https://getsnowballpay.com';
const DAYS_AHEAD      = 3;
const MAX_STREAK_MONTHS = 24; // keep in sync with paymentRecords take below

// month0 is 0-indexed (matches Date.getMonth())
function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

function computeStreak(
  // May contain duplicate {dueYear, dueMonth} pairs (flatMap across debts).
  // .some() is duplicate-safe — does not inflate the count.
  records: { dueYear: number; dueMonth: number }[],
  targetYear: number,
  targetMonth: number, // 0-11
): number {
  let streak = 0;
  let y = targetYear;
  let m = targetMonth - 1;
  if (m < 0) { m = 11; y--; }

  for (let i = 0; i < MAX_STREAK_MONTHS; i++) {
    if (!records.some((r) => r.dueYear === y && r.dueMonth === m)) break;
    streak++;
    m--;
    if (m < 0) { m = 11; y--; }
  }
  return streak;
}

function formatDueDate(day: number, month: number, year: number): string {
  return new Date(year, month, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev) {
    const secret = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'email_not_configured' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const now = new Date();
  const target = new Date(now);
  target.setDate(now.getDate() + DAYS_AHEAD);
  const targetDay   = target.getDate();
  const targetYear  = target.getFullYear();
  const targetMonth = target.getMonth(); // 0-11

  const lastDay  = daysInMonth(targetYear, targetMonth);
  const isLastDay = targetDay === lastDay;

  const debts = await prisma.debt.findMany({
    where: {
      dueDate: isLastDay ? { gte: targetDay } : targetDay,
      user: {
        OR: [
          { preferences: { is: null } },
          { preferences: { notifyDueDates: true, emailOptOut: false } },
        ],
      },
      NOT: {
        paymentRecords: {
          some: { dueYear: targetYear, dueMonth: targetMonth },
        },
      },
    },
    select: {
      id:             true,
      name:           true,
      minimumPayment: true,
      user: {
        select: { id: true, email: true, name: true },
      },
      paymentRecords: {
        select:  { dueYear: true, dueMonth: true },
        orderBy: [{ dueYear: 'desc' }, { dueMonth: 'desc' }],
        take:    MAX_STREAK_MONTHS,
      },
    },
  });

  // Group by userId — one email per user listing all their due debts
  type DebtRow = (typeof debts)[number];
  const byUser = new Map<string, { user: DebtRow['user']; debts: DebtRow[] }>();
  for (const debt of debts) {
    const entry = byUser.get(debt.user.id);
    if (entry) {
      entry.debts.push(debt);
    } else {
      byUser.set(debt.user.id, { user: debt.user, debts: [debt] });
    }
  }

  const dueDateLabel = formatDueDate(targetDay, targetMonth, targetYear);
  let sent = 0;
  let skipped = 0;

  for (const { user, debts: userDebts } of byUser.values()) {
    // Flatten all payment records across debts for a per-user streak
    const allRecords = userDebts.flatMap((d) => d.paymentRecords);
    const streak = computeStreak(allRecords, targetYear, targetMonth);

    const debtCount = userDebts.length;
    const subject   = debtCount === 1
      ? `Your ${userDebts[0].name} payment is due in ${DAYS_AHEAD} days`
      : `You have ${debtCount} payments due in ${DAYS_AHEAD} days`;

    try {
      const unsubToken     = generateDigestUnsubscribeToken(user.id);
      const unsubscribeUrl = `${BASE}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

      const html = await render(
        React.createElement(DueDateReminderEmail, {
          userName:     user.name?.split(' ')[0] || 'there',
          debts:        userDebts.map((d) => ({ name: d.name, minimumPayment: d.minimumPayment })),
          dueDateLabel,
          daysUntilDue: DAYS_AHEAD,
          streak,
          unsubscribeUrl,
        }),
      );

      await resend.emails.send({ from: FROM, to: user.email, subject, html });
      sent++;
    } catch (e) {
      console.error(`[due-date-reminder] failed for user ${user.id}:`, e);
      skipped++;
    }
  }

  return NextResponse.json({ sent, skipped, targetDay, targetYear, targetMonth });
}
