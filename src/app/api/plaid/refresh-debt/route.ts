import { NextRequest, NextResponse } from 'next/server';
import type { AccountBase } from 'plaid';
import { z } from 'zod';
import { verifyAuth, unauthorized, isValidId, tooManyRequests } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { limits } from '@/lib/rateLimit';
import { upgradeRequired } from '@/lib/gates';
import { logPlaidError, canUsePlaid } from '@/lib/plaid';
import { syncPlaidItemBalances } from '@/lib/plaidSync';

const RefreshDebtSchema = z.object({
  debtId: z.string().min(1),
});

/**
 * POST /api/plaid/refresh-debt
 *
 * Refreshes a linked debt's balance from Plaid.
 * Loads the access_token from the related PlaidItem (tokens are stored once
 * per institution login, not per Debt).
 * Returns: { success, balance, lastSyncedAt }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.valid || !auth.user) return unauthorized();

    const userId = auth.user.id;

    if (!(await canUsePlaid(userId, auth.user.email))) return upgradeRequired('Bank sync');

    if (!(await limits.plaidSync(userId))) return tooManyRequests();

    const parsed = RefreshDebtSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success || !isValidId(parsed.data.debtId)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    const { debtId } = parsed.data;

    // Fetch the debt along with its PlaidItem (which holds the access token)
    const debt = await prisma.debt.findUnique({
      where: { id: debtId },
      include: { plaidItem: true },
    });

    if (!debt || debt.userId !== userId) {
      return NextResponse.json(
        { error: 'Debt not found or unauthorized' },
        { status: 404 }
      );
    }

    if (!debt.isLinked || !debt.plaidItemId || !debt.plaidAccountId) {
      return NextResponse.json(
        { error: 'Debt is not linked to Plaid' },
        { status: 400 }
      );
    }

    // The item-owner check should be implied by debt.userId above, but guard
    // against a stale/corrupted relation before decrypting another tenant's
    // token (least-privilege: never sync an item the caller doesn't own).
    if (!debt.plaidItem?.accessToken || debt.plaidItem.userId !== userId) {
      return NextResponse.json(
        { error: 'Plaid access token not found for this debt' },
        { status: 400 }
      );
    }

    // One liabilitiesGet updates EVERY linked debt on this item, not just the
    // one clicked — same shared sync the Plaid webhook uses.
    const { accounts, updates, syncedAt: now } = await syncPlaidItemBalances(
      debt.plaidItem
    );

    // Respond about the debt the user actually clicked (preserve prior contract
    // and 404/422 semantics); sibling debts were updated above regardless.
    const requested = updates.find((u) => u.id === debtId);
    if (!requested) {
      const reqAccount = accounts.find(
        (acc: AccountBase) => acc.account_id === debt.plaidAccountId
      );
      return NextResponse.json(
        reqAccount
          ? { error: 'No balance available from Plaid' }
          : { error: 'Account not found in Plaid' },
        { status: reqAccount ? 422 : 404 }
      );
    }

    return NextResponse.json({
      success: true,
      balance: requested.newBalance,
      lastSyncedAt: now,
    });
  } catch (error) {
    logPlaidError('Error refreshing debt from Plaid:', error);
    return NextResponse.json(
      { error: 'Failed to refresh debt' },
      { status: 500 }
    );
  }
}
