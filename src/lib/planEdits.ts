import { prisma } from '@/lib/prisma';

/**
 * Lifecycle emails judge "is this plan still in use?" from row timestamps:
 * a debt, income, expense, or payment write leaves one behind. A delete
 * leaves nothing, so the routes that delete plan rows stamp the user
 * instead.
 *
 * Best-effort, after the delete has committed: the stamp is bookkeeping
 * for an email, and must never make a delete fail (for example while the
 * planEditedAt column is not yet pushed to production). A failure is
 * logged and the worst case is one misjudged lifecycle email.
 */
export async function markPlanEdited(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { planEditedAt: new Date() },
      select: { id: true },
    });
  } catch (error) {
    console.error('[planEdits] planEditedAt stamp failed', userId, error);
  }
}

/**
 * When the user last deleted a plan row, or null: never, or the column is
 * not deployed yet (logged, not thrown, so a lifecycle scan keeps running).
 */
export async function readPlanEditedAt(userId: string): Promise<Date | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planEditedAt: true },
    });
    return user?.planEditedAt ?? null;
  } catch (error) {
    console.error('[planEdits] planEditedAt read failed', userId, error);
    return null;
  }
}
