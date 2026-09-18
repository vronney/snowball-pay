import { prisma } from '@/lib/prisma';

/**
 * Lifecycle emails judge "is this plan still in use?" from row timestamps:
 * a debt, income, expense, or payment write leaves one behind. A delete
 * leaves nothing, so the routes that delete plan rows stamp the user
 * instead. Returned as a PrismaPromise so the caller can put it in the
 * same transaction as the delete.
 */
export function markPlanEdited(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { planEditedAt: new Date() },
    select: { id: true },
  });
}
