import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import { getUserTier, FREE_DEBT_LIMIT, upgradeRequired } from '@/lib/gates';

const DEBT_SCHEMA = z.object({
  name: z.string().min(1, 'Debt name required'),
  category: z.enum(['Credit Card', 'Student Loan', 'Auto Loan', 'Mortgage', 'Personal Loan', 'Medical Debt', 'Other']),
  balance: z.number().min(0),
  interestRate: z.number().min(0).max(100),
  minimumPayment: z.number().min(0),
  creditLimit: z.number().min(0).optional(),
  dueDate: z.number().min(1).max(31).optional(),
});

const COMPLETE_SCHEMA = z
  .object({
    income: z.object({
      monthlyTakeHome: z.number().min(0),
      essentialExpenses: z.number().min(0),
      extraPayment: z.number().min(0),
      payoffMethod: z.enum(['snowball', 'avalanche', 'custom']).default('snowball'),
    }),
    // Legacy single-debt shape, still sent by clients loaded before this deploy.
    firstDebt: DEBT_SCHEMA.optional(),
    // Preferred shape: every debt from the calculator session in payoff-input order.
    debts: z.array(DEBT_SCHEMA).min(1).max(30).optional(),
  })
  .refine((data) => data.firstDebt || (data.debts && data.debts.length > 0), {
    message: 'At least one debt is required',
  });

const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const replayCache = new Map<string, { expiresAt: number; response: unknown }>();

function getReplayKey(userId: string, idempotencyKey: string): string {
  return `${userId}:${idempotencyKey}`;
}

function getCachedReplay(userId: string, idempotencyKey: string): unknown | null {
  const key = getReplayKey(userId, idempotencyKey);
  const hit = replayCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    replayCache.delete(key);
    return null;
  }
  return hit.response;
}

function setCachedReplay(userId: string, idempotencyKey: string, response: unknown) {
  replayCache.set(getReplayKey(userId, idempotencyKey), {
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    response,
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  const idempotencyKey = request.headers.get('x-idempotency-key')?.trim() || undefined;

  if (idempotencyKey) {
    const cached = getCachedReplay(auth.user.id, idempotencyKey);
    if (cached) return NextResponse.json(cached);
  }

  try {
    const body = await request.json();
    const parsed = COMPLETE_SCHEMA.parse(body);

    const incomingDebts = parsed.debts ?? (parsed.firstDebt ? [parsed.firstDebt] : []);

    const tier = await getUserTier(auth.user.id);
    let debtCapacity = Infinity;
    if (tier === 'free') {
      const debtCount = await prisma.debt.count({ where: { userId: auth.user.id } });
      if (debtCount >= FREE_DEBT_LIMIT) return upgradeRequired('Unlimited debts');
      debtCapacity = FREE_DEBT_LIMIT - debtCount;
    }

    // Never fail the whole onboarding because the calculator carried more
    // debts than the free tier allows — save what fits and report the rest
    // so the dashboard can surface the upgrade path.
    const debtsToCreate = incomingDebts.slice(0, debtCapacity);
    const skippedDebts = incomingDebts.length - debtsToCreate.length;

    // Custom ordering is Pro-only (mirrors POST /api/income). Onboarding
    // never hard-fails on tier limits, so a free user's draft falls back to
    // snowball instead of 403ing — and, critically, this route can't be used
    // to plant a 'custom' record that the income route's grandfather clause
    // would then honor forever.
    const payoffMethod =
      parsed.income.payoffMethod === 'custom' && tier === 'free'
        ? 'snowball'
        : parsed.income.payoffMethod;

    const result = await prisma.$transaction(async (tx) => {
      // The wizard's "extra monthly payment" answer seeds the acceleration
      // amount (the slider) — the single control for extra toward debt. An
      // explicit 0 is stored as 0 (minimums only); null is reserved for the
      // "use the full surplus" default and is never written here, so the plan
      // matches the numbers the user saw in the calculator.
      const seededAcceleration = parsed.income.extraPayment;
      const income = await tx.income.upsert({
        where: { userId: auth.user!.id },
        update: {
          monthlyTakeHome: parsed.income.monthlyTakeHome,
          essentialExpenses: parsed.income.essentialExpenses,
          extraPayment: 0,
          accelerationAmount: seededAcceleration,
          payoffMethod,
        },
        create: {
          userId: auth.user!.id,
          monthlyTakeHome: parsed.income.monthlyTakeHome,
          essentialExpenses: parsed.income.essentialExpenses,
          extraPayment: 0,
          accelerationAmount: seededAcceleration,
          payoffMethod,
        },
      });

      const debtIds: string[] = [];
      let dedupedCount = 0;

      for (const debtInput of debtsToCreate) {
        // Best-effort duplicate guard for replayed onboarding submits (the
        // in-memory replayCache doesn't survive restarts or other instances).
        // Two constraints keep it from eating legitimate debts:
        // - `id notIn` excludes rows already claimed by THIS request, so two
        //   genuinely identical debts in one payload don't collapse into one.
        // - `createdAt` bounds the match to the idempotency window, so an
        //   unrelated old debt with coincidentally identical values is never
        //   mistaken for a replay.
        const existingDebt = idempotencyKey
          ? await tx.debt.findFirst({
              where: {
                userId: auth.user!.id,
                name: debtInput.name,
                category: debtInput.category,
                balance: debtInput.balance,
                interestRate: debtInput.interestRate,
                minimumPayment: debtInput.minimumPayment,
                // Copy: the live array keeps growing as the loop proceeds.
                id: { notIn: [...debtIds] },
                createdAt: { gte: new Date(Date.now() - IDEMPOTENCY_TTL_MS) },
              },
              orderBy: { createdAt: 'desc' },
            })
          : null;

        if (existingDebt) {
          dedupedCount++;
          debtIds.push(existingDebt.id);
          continue;
        }

        const debt = await tx.debt.create({
          data: {
            userId: auth.user!.id,
            name: debtInput.name,
            category: debtInput.category,
            balance: debtInput.balance,
            originalBalance: debtInput.balance,
            interestRate: debtInput.interestRate,
            minimumPayment: debtInput.minimumPayment,
            creditLimit: debtInput.creditLimit ?? 0,
            dueDate: debtInput.dueDate,
          },
        });
        debtIds.push(debt.id);
      }

      return {
        incomeId: income.id,
        debtId: debtIds[0],
        debtIds,
        skippedDebts,
        dedupedDebt: dedupedCount > 0,
      };
    });

    if (idempotencyKey) {
      setCachedReplay(auth.user.id, idempotencyKey, result);
    }

    // The lead's plan snapshot exists to survive the signup gap; the plan is
    // now committed, so drop the stored copy (PII minimization). Best-effort:
    // a cleanup failure must never fail a completed onboarding.
    if (auth.user.email) {
      try {
        await prisma.calculatorLead.updateMany({
          where: { email: auth.user.email.trim().toLowerCase() },
          data: { planSnapshot: Prisma.DbNull },
        });
      } catch {
        // Snapshot cleanup is non-critical; the lifecycle cron marks the
        // lead converted independently.
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message || 'Invalid request payload');
    }
    console.error('Error completing onboarding:', error);
    return serverError('Failed to complete onboarding setup');
  }
}
