import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth, unauthorized, isValidId, tooManyRequests } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { plaidClient, logPlaidError } from '@/lib/plaid';
import { decryptToken } from '@/lib/plaidCrypto';
import { limits } from '@/lib/rateLimit';

/**
 * Request body: { plaidItemId: string }
 *
 * `plaidItemId` is the PlaidItem ROW id (PlaidItem.id), NOT the raw Plaid
 * item_id. We deliberately key off our own primary key for a stable,
 * user-scoped lookup.
 */
const DisconnectSchema = z.object({
  plaidItemId: z.string().min(1),
});

/**
 * POST /api/plaid/disconnect
 *
 * Disconnects a linked institution login:
 *  1. Authenticates the user.
 *  2. Loads the PlaidItem and verifies ownership.
 *  3. Calls Plaid /item/remove to revoke the token and stop billing. If Plaid
 *     errors (e.g. token already invalid), we log and STILL proceed locally —
 *     we must not retain a token we cannot bill-revoke; better to drop our copy.
 *  4. Unlinks the related debts (isLinked=false). The debts themselves remain
 *     (Debt.plaidItemId is cleared via onDelete: SetNull). plaidAccountId /
 *     plaidPersistentAccountId are KEPT so a later re-link re-attaches the same
 *     debt instead of duplicating it.
 *  5. Deletes the PlaidItem row.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.valid || !auth.user) return unauthorized();

    const userId = auth.user.id;

    if (!(await limits.plaidDisconnect(userId))) return tooManyRequests();

    const parsed = DisconnectSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success || !isValidId(parsed.data.plaidItemId)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    const { plaidItemId } = parsed.data;

    // Load the PlaidItem and verify it belongs to the user
    const plaidItem = await prisma.plaidItem.findUnique({
      where: { id: plaidItemId },
    });

    if (!plaidItem || plaidItem.userId !== userId) {
      return NextResponse.json(
        { error: 'Plaid item not found or unauthorized' },
        { status: 404 }
      );
    }

    // Revoke the token with Plaid to stop billing. If it fails, proceed anyway —
    // we should not keep a token locally that we cannot bill-revoke.
    try {
      await plaidClient.itemRemove({
        access_token: decryptToken(plaidItem.accessToken),
      });
    } catch (plaidError) {
      logPlaidError('Plaid itemRemove failed (proceeding with local cleanup):', plaidError);
    }

    // Unlink the debts and delete the item atomically — the token was already
    // revoked above, so a partial local cleanup would strand debts pointing at
    // a dead item. Debts remain but become unlinked (plaidItemId is set null
    // automatically via onDelete: SetNull). Keep plaidAccountId: a later
    // re-link matches on it to re-attach this exact debt (preserving its
    // history) instead of creating a duplicate.
    await prisma.$transaction([
      prisma.debt.updateMany({
        where: { plaidItemId: plaidItem.id },
        data: { isLinked: false },
      }),
      prisma.plaidItem.delete({
        where: { id: plaidItem.id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    logPlaidError('Error disconnecting Plaid item:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}
