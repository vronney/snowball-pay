import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError, tooManyRequests } from '@/lib/auth-server';
import { resolveBillingVerdict } from '@/lib/gates';
import { limits } from '@/lib/rateLimit';
import { buildDashboardInsights } from '@/lib/dashboard/buildInsights';
import { resolveToday } from '@/lib/dashboard/today';
import type { Debt, Income } from '@/types';

/** GET /api/dashboard/insights?today=YYYY-MM-DD — every dashboard v2 figure (spec §5.2). */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();
  const userId = auth.user.id;

  if (!(await limits.dashboardInsights(userId))) return tooManyRequests(undefined, 60);

  const today = resolveToday(new URL(request.url).searchParams.get('today'));

  try {
    const [debtRows, income, expenses, monthRecords, anyPayment, snapshots, verdict] = await Promise.all([
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
    ]);

    const trialEndsAt = verdict.signupTrialEndsAt;
    const insights = buildDashboardInsights({
      // The same rows GET /api/debts and /api/income serve; nullable dueDate is handled with `== null`.
      debts: debtRows as unknown as Debt[],
      income: income as unknown as Income | null,
      expenses,
      monthRecords,
      hasAnyPayment: anyPayment !== null,
      snapshots: snapshots.map((s) => ({ ...s, recordedAt: s.recordedAt.toISOString() })),
      tier: {
        proEligible: verdict.proEligible,
        paidPro: verdict.paidPro,
        trial: {
          active: !verdict.paidPro && trialEndsAt !== null && trialEndsAt.getTime() > Date.now(),
          endsAt: trialEndsAt?.toISOString() ?? null,
        },
      },
      today,
    });

    return NextResponse.json(insights, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Dashboard insights error:', error);
    return serverError('Failed to load dashboard insights');
  }
}
