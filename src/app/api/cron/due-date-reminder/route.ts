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
import { render } from '@react-email/render';
import { prisma } from '@/lib/prisma';
import { EMAIL_FROM, APP_BASE_URL, MAX_STREAK_MONTHS } from '@/lib/constants/app';
import {
  verifyCronRequest,
  sendEmail,
  handleMissingResendConfig,
} from '@/lib/services/emailService';
import {
  daysInMonth,
  computeStreak,
  formatDateShort,
} from '@/lib/utils/date';
import { generateDigestUnsubscribeToken } from '@/lib/unsubscribeToken';
import DueDateReminderEmail from '@/emails/DueDateReminderEmail';
import * as React from 'react';

const DAYS_AHEAD = 3;

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(handleMissingResendConfig());
  }

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
      balance: { gt: 0.01 },
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

  const dueDateLabel = formatDateShort(new Date(targetYear, targetMonth, targetDay));
  let sent = 0;
  let skipped = 0;

  for (const { user, debts: userDebts } of byUser.values()) {
    // Flatten all payment records across debts for a per-user streak
    const allRecords = userDebts.flatMap((d) => d.paymentRecords);
    const streak = computeStreak(allRecords, targetYear, targetMonth, MAX_STREAK_MONTHS);

    const debtCount = userDebts.length;
    const subject   = debtCount === 1
      ? `Your ${userDebts[0].name} payment is due in ${DAYS_AHEAD} days`
      : `You have ${debtCount} payments due in ${DAYS_AHEAD} days`;

    try {
      const unsubToken     = generateDigestUnsubscribeToken(user.id);
      const unsubscribeUrl = `${APP_BASE_URL}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

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

      const result = await sendEmail(user.email, EMAIL_FROM, subject, html);
      if (result.success) {
        sent++;
      } else {
        skipped++;
      }
    } catch (e) {
      console.error(`[due-date-reminder] failed for user ${user.id}:`, e);
      skipped++;
    }
  }

  return NextResponse.json({ sent, skipped, targetDay, targetYear, targetMonth });
}
