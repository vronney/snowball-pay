/**
 * Removes every Plaid item for a user whose subscription has ended, so
 * dormant links stop accruing Plaid's per-account monthly billing (a
 * downgraded user's items otherwise stay alive — and billable — forever).
 *
 * Called from the Stripe webhook on `customer.subscription.deleted`, AFTER
 * the user row is downgraded. Never throws: a Plaid hiccup must not 500 the
 * billing webhook (Stripe would retry the whole event).
 *
 * Debts keep their plaidAccountId / plaidPersistentAccountId (same semantics
 * as /api/plaid/disconnect), so a later re-subscribe + re-link re-attaches
 * the same debts instead of duplicating them.
 */
import { prisma } from '@/lib/prisma';
import { plaidClient, logPlaidError, isPlaidAllowed } from '@/lib/plaid';
import { decryptToken } from '@/lib/plaidCrypto';
import { isPro } from '@/lib/gates';

export type PlaidCleanupResult =
  | { outcome: 'removed'; removed: number; revokeErrors: number }
  | { outcome: 'no_items' }
  | { outcome: 'skipped_allowlisted' }
  | { outcome: 'skipped_still_pro' }
  | { outcome: 'error' };

export async function removePlaidItemsForCanceledUser(
  userId: string,
): Promise<PlaidCleanupResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        plaidItems: { select: { id: true, accessToken: true } },
      },
    });
    if (!user || user.plaidItems.length === 0) return { outcome: 'no_items' };

    // Allowlisted testers keep bank sync regardless of subscription status.
    if (isPlaidAllowed(user.email)) return { outcome: 'skipped_allowlisted' };

    // Out-of-order webhook protection: if a newer subscription is already
    // active by the time the deleted event lands, keep the links.
    if (await isPro(userId)) return { outcome: 'skipped_still_pro' };

    let removed = 0;
    let revokeErrors = 0;
    for (const item of user.plaidItems) {
      // Same rule as /api/plaid/disconnect: revoke with Plaid to stop billing;
      // if that fails, still drop our copy — never retain a token we cannot
      // bill-revoke.
      try {
        await plaidClient.itemRemove({
          access_token: decryptToken(item.accessToken),
        });
      } catch (error) {
        revokeErrors++;
        logPlaidError(
          'Plaid itemRemove failed during cancel cleanup (proceeding with local cleanup):',
          error,
        );
      }
      await prisma.$transaction([
        prisma.debt.updateMany({
          where: { plaidItemId: item.id },
          data: { isLinked: false },
        }),
        prisma.plaidItem.delete({ where: { id: item.id } }),
      ]);
      removed++;
    }
    return { outcome: 'removed', removed, revokeErrors };
  } catch (error) {
    logPlaidError('Plaid cancel cleanup failed:', error);
    return { outcome: 'error' };
  }
}
