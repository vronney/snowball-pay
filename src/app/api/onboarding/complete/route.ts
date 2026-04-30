import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import { getUserTier, FREE_DEBT_LIMIT, upgradeRequired } from '@/lib/gates';

const COMPLETE_SCHEMA = z.object({
  income: z.object({
    monthlyTakeHome: z.number().min(0),
    essentialExpenses: z.number().min(0),
    extraPayment: z.number().min(0),
    payoffMethod: z.enum(['snowball', 'avalanche', 'custom']).default('snowball'),
  }),
  firstDebt: z.object({
    name: z.string().min(1, 'Debt name required'),
    category: z.enum(['Credit Card', 'Student Loan', 'Auto Loan', 'Mortgage', 'Personal Loan', 'Medical Debt', 'Other']),
    balance: z.number().min(0),
    interestRate: z.number().min(0).max(100),
    minimumPayment: z.number().min(0),
    creditLimit: z.number().min(0).optional(),
    dueDate: z.number().min(1).max(31).optional(),
  }),
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

    const tier = await getUserTier(auth.user.id);
    if (tier === 'free') {
      const debtCount = await prisma.debt.count({ where: { userId: auth.user.id } });
      if (debtCount >= FREE_DEBT_LIMIT) return upgradeRequired('Unlimited debts');
    }

    const result = await prisma.$transaction(async (tx) => {
      const income = await tx.income.upsert({
        where: { userId: auth.user!.id },
        update: {
          monthlyTakeHome: parsed.income.monthlyTakeHome,
          essentialExpenses: parsed.income.essentialExpenses,
          extraPayment: parsed.income.extraPayment,
          payoffMethod: parsed.income.payoffMethod,
        },
        create: {
          userId: auth.user!.id,
          monthlyTakeHome: parsed.income.monthlyTakeHome,
          essentialExpenses: parsed.income.essentialExpenses,
          extraPayment: parsed.income.extraPayment,
          payoffMethod: parsed.income.payoffMethod,
        },
      });

      // Best-effort duplicate guard for replayed onboarding submits.
      // This avoids accidental duplicate first debt rows when users double-submit.
      const existingDebt = idempotencyKey
        ? await tx.debt.findFirst({
            where: {
              userId: auth.user!.id,
              name: parsed.firstDebt.name,
              category: parsed.firstDebt.category,
              balance: parsed.firstDebt.balance,
              interestRate: parsed.firstDebt.interestRate,
              minimumPayment: parsed.firstDebt.minimumPayment,
            },
            orderBy: { createdAt: 'desc' },
          })
        : null;

      const debt = existingDebt
        ? existingDebt
        : await tx.debt.create({
            data: {
              userId: auth.user!.id,
              name: parsed.firstDebt.name,
              category: parsed.firstDebt.category,
              balance: parsed.firstDebt.balance,
              originalBalance: parsed.firstDebt.balance,
              interestRate: parsed.firstDebt.interestRate,
              minimumPayment: parsed.firstDebt.minimumPayment,
              creditLimit: parsed.firstDebt.creditLimit ?? 0,
              dueDate: parsed.firstDebt.dueDate,
            },
          });

      return {
        incomeId: income.id,
        debtId: debt.id,
        dedupedDebt: Boolean(existingDebt),
      };
    });

    if (idempotencyKey) {
      setCachedReplay(auth.user.id, idempotencyKey, result);
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
