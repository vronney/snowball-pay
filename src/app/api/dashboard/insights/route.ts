import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError, tooManyRequests } from '@/lib/auth-server';
import { isSelfServeTrialEligible, resolveBillingVerdict } from '@/lib/gates';
import { wholeDaysRemaining } from '@/lib/billing';
import { limits } from '@/lib/rateLimit';
import { buildDashboardInsights } from '@/lib/dashboard/buildInsights';
import { resolveToday } from '@/lib/dashboard/today';
import {
  TRIAL_MOMENT_WINDOW_DAYS,
  storedTrialBaseline,
  trialBaselineFields,
  trialStartOf,
  type TrialBaselineFields,
} from '@/lib/dashboard/trialMoment';
import { debtFromRow, incomeFromRow } from '@/lib/prismaMappers';

/** GET /api/dashboard/insights?today=YYYY-MM-DD — every dashboard v2 figure (spec §5.2). */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();
  const userId = auth.user.id;

  const today = resolveToday(new URL(request.url).searchParams.get('today'));

  try {
    if (!(await limits.dashboardInsights(userId))) return tooManyRequests();

    const [debtRows, income, expenses, monthRecords, anyPayment, snapshots, verdict, preferences] = await Promise.all([
      prisma.debt.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.income.findUnique({ where: { userId } }),
      prisma.expense.findMany({ where: { userId }, select: { amount: true } }),
      prisma.paymentRecord.findMany({
        where: { userId, dueYear: today.getFullYear(), dueMonth: today.getMonth() },
        select: { debtId: true, dueYear: true, dueMonth: true },
      }),
      prisma.paymentRecord.findFirst({ where: { userId }, select: { id: true } }),
      prisma.balanceSnapshot.findMany({
        where: { userId, debt: { userId } },
        orderBy: { recordedAt: 'asc' },
        select: { debtId: true, balance: true, recordedAt: true },
      }),
      resolveBillingVerdict(userId),
      prisma.userPreferences.findUnique({
        where: { userId },
        select: { trialBaselineAt: true, trialBaselineMonths: true, trialBaselineInterest: true },
      }),
    ]);

    const now = new Date();
    const trialEndsAt = verdict.signupTrialEndsAt;
    const trialActive = !verdict.paidPro && trialEndsAt !== null && trialEndsAt.getTime() > now.getTime();
    // Payments logged during the trial feed moment C only, so they are
    // counted only in its last days.
    const inLastDays =
      trialActive && trialEndsAt !== null && wholeDaysRemaining(trialEndsAt, now.getTime()) <= TRIAL_MOMENT_WINDOW_DAYS;
    const [eligible, paymentsSinceStart] = await Promise.all([
      isSelfServeTrialEligible(auth.user.email, verdict),
      inLastDays && trialEndsAt !== null
        ? prisma.paymentRecord.count({ where: { userId, paidAt: { gte: trialStartOf(trialEndsAt) } } })
        : Promise.resolve(null),
    ]);
    const baseline = storedTrialBaseline(preferences);

    const insights = buildDashboardInsights({
      // The same rows GET /api/debts and /api/income serve, mapped to the domain types at this boundary.
      debts: debtRows.map(debtFromRow),
      income: income ? incomeFromRow(income) : null,
      expenses,
      monthRecords,
      hasAnyPayment: anyPayment !== null,
      snapshots: snapshots.map((s) => ({ ...s, recordedAt: s.recordedAt.toISOString() })),
      tier: {
        proEligible: verdict.proEligible,
        paidPro: verdict.paidPro,
        trial: { active: trialActive, endsAt: trialEndsAt?.toISOString() ?? null, eligible },
      },
      today,
      trial: { now, baseline, paymentsSinceStart },
    });

    // Signup trials, and a self-serve trial started before its plan paid off,
    // take their baseline from the first plan seen during the trial (spec §6.4).
    if (insights.tier.trial.active && baseline === null && insights.plan) {
      await writeTrialBaseline(userId, preferences !== null, trialBaselineFields(insights.plan, today));
    }

    return NextResponse.json(insights, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Dashboard insights error:', error);
    return serverError('Failed to load dashboard insights');
  }
}

/** Conditional, so a concurrent first read can't overwrite a baseline that just landed. Never fails the response. */
async function writeTrialBaseline(userId: string, hasPreferences: boolean, fields: TrialBaselineFields): Promise<void> {
  try {
    if (hasPreferences) {
      await prisma.userPreferences.updateMany({ where: { userId, trialBaselineAt: null }, data: fields });
    } else {
      await prisma.userPreferences.create({ data: { userId, ...fields } });
    }
  } catch (error) {
    // Most likely a concurrent create (P2002). The next read retries if no baseline stands.
    console.error('[insights] trial baseline write failed', error);
  }
}
