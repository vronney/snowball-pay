import { prisma } from '@/lib/prisma';

// Prisma only, on purpose: the Stripe webhook imports this module, and its
// tests mock '@/lib/stripe' without PLANS, so importing gates.ts here would
// crash them at load. Callers compare the count with FREE_DEBT_LIMIT.

/** The debts the Free cap counts: every in-plan debt, paid-off ones included (spec §6.3). */
export function countCountedDebts(userId: string): Promise<number> {
  return prisma.debt.count({ where: { userId, inPlan: true } });
}

/**
 * Becoming Pro counts every debt (spec §6.3): move the ones saved outside the
 * plan back in. Idempotent, so a retried webhook is harmless. Returns how
 * many moved.
 */
export async function moveOutsideDebtsIntoPlan(userId: string): Promise<number> {
  const { count } = await prisma.debt.updateMany({
    where: { userId, inPlan: false },
    data: { inPlan: true },
  });
  return count;
}
