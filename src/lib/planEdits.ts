import { Prisma } from '@prisma/client';
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

/** Prisma P2022: the column does not exist in the current database. */
const MISSING_COLUMN_CODE = 'P2022';

function isMissingColumn(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === MISSING_COLUMN_CODE;
}

/**
 * Outcome of reading the delete stamp. Only the expected rollout state
 * (column not pushed yet) collapses to "no stamp"; any other failure is
 * unknown, and a caller deciding whether to email must not read unknown
 * as "inactive".
 */
export type PlanEditedAtLookup =
  | { ok: true; planEditedAt: Date | null }
  | { ok: false; reason: 'column_missing' | 'failed' };

export async function readPlanEditedAt(userId: string): Promise<PlanEditedAtLookup> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planEditedAt: true },
    });
    return { ok: true, planEditedAt: user?.planEditedAt ?? null };
  } catch (error) {
    if (isMissingColumn(error)) {
      console.warn('[planEdits] planEditedAt column not deployed yet; treating as no delete stamp');
      return { ok: false, reason: 'column_missing' };
    }
    console.error('[planEdits] planEditedAt read failed', userId, error);
    return { ok: false, reason: 'failed' };
  }
}
