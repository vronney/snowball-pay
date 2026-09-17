import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError, tooManyRequests } from '@/lib/auth-server';
import { isSelfServeTrialEligible, resolveBillingVerdict } from '@/lib/gates';
import { isDashboardV2 } from '@/lib/flags';
import { limits } from '@/lib/rateLimit';
import { trialGrantKey } from '@/lib/trialGrantKey';
import { moveOutsideDebtsIntoPlan } from '@/lib/debtCap';
import { calculatePlanMetrics } from '@/lib/payoffPlan';
import { isPayoffComplete } from '@/lib/dashboard/payoffCompletion';
import { resolveToday } from '@/lib/dashboard/today';
import { trialBaselineFields } from '@/lib/dashboard/trialMoment';
import { debtFromRow, incomeFromRow } from '@/lib/prismaMappers';
import { captureServerEvent } from '@/lib/analytics-server';
import { ANALYTICS_CONSENT_KEY } from '@/lib/analyticsConsent';
import { Events } from '@/lib/analyticsEvents';

const BodySchema = z.object({ today: z.string().optional() }).strict();

const trialUsed = () => NextResponse.json({ error: 'trial_used' }, { status: 409 });

/**
 * POST /api/trial/start — a never-trialed Free account starts its own
 * 14-day Pro window (spec §6.4). The TrialGrant `create` is the atomic
 * once-per-email guard; the start, the baseline and the move of outside
 * debts into the plan commit with it or not at all.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();
  const { id: userId, email } = auth.user;

  // Opt-in per account while dashboard v2 rolls out (spec §5.3): the old UI
  // and Expo never start a trial.
  if (!isDashboardV2(email)) return NextResponse.json({ error: 'not_available' }, { status: 403 });

  let parsed: z.infer<typeof BodySchema>;
  try {
    const raw = await request.text();
    const result = BodySchema.safeParse(raw ? JSON.parse(raw) : {});
    if (!result.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const today = resolveToday(parsed.today ?? null);

  try {
    if (!(await limits.trialStart(userId))) return tooManyRequests();

    const verdict = await resolveBillingVerdict(userId);
    if (!email || !(await isSelfServeTrialEligible(email, verdict))) return trialUsed();

    const [debtRows, incomeRow, expenses] = await Promise.all([
      prisma.debt.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.income.findUnique({ where: { userId } }),
      prisma.expense.findMany({ where: { userId }, select: { amount: true } }),
    ]);
    // The trial counts every debt (spec §6.3), so the baseline is the plan
    // the dashboard will show once the outside debts move in.
    const debts = debtRows.map(debtFromRow).map((debt) => ({ ...debt, inPlan: true }));
    const planStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const metrics = calculatePlanMetrics(debts, incomeRow ? incomeFromRow(incomeRow) : null, expenses, { planStartDate });
    const baseline = trialBaselineFields(
      metrics && isPayoffComplete(metrics.result)
        ? { months: metrics.result.months, totalInterest: metrics.result.totalInterestPaid }
        : null,
      today,
    );

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.trialGrant.create({ data: { emailHash: trialGrantKey(email), grantedAt: now } });
      await tx.userPreferences.upsert({
        where: { userId },
        create: { userId, trialStartedAt: now, ...baseline },
        update: { trialStartedAt: now, ...baseline },
      });
      await moveOutsideDebtsIntoPlan(userId, tx);
    });

    const consent = request.cookies.get(ANALYTICS_CONSENT_KEY)?.value === 'granted' ? 'granted' : 'denied';
    await captureServerEvent({
      consent,
      distinctId: userId,
      event: Events.TRIAL_SELF_SERVE_STARTED,
      insertId: `${Events.TRIAL_SELF_SERVE_STARTED}:${userId}`,
      properties: { source: 'dashboard_v2' },
    }).catch(() => { /* analytics must never fail the start */ });

    const fresh = await resolveBillingVerdict(userId);
    return NextResponse.json({
      proEligible: fresh.proEligible,
      paidPro: fresh.paidPro,
      signupTrialEndsAt: fresh.signupTrialEndsAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return trialUsed();
    console.error('Trial start error:', error);
    return serverError('Failed to start trial');
  }
}
