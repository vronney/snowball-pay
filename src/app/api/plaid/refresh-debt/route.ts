import { NextRequest, NextResponse } from 'next/server';
import type { AccountBase } from 'plaid';
import { z } from 'zod';
import { verifyAuth, unauthorized, isValidId, tooManyRequests } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { limits } from '@/lib/rateLimit';
import { upgradeRequired } from '@/lib/gates';
import {
  plaidClient,
  logPlaidError,
  canUsePlaid,
  extractCurrentBalance,
} from '@/lib/plaid';
import { decryptToken } from '@/lib/plaidCrypto';

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

    const storedToken = debt.plaidItem?.accessToken;
    if (!storedToken) {
      return NextResponse.json(
        { error: 'Plaid access token not found for this debt' },
        { status: 400 }
      );
    }
    const accessToken = decryptToken(storedToken);

    // Fetch liabilities to get updated balance
    const liabilitiesResponse = await plaidClient.liabilitiesGet({
      access_token: accessToken,
    });

    const accounts = liabilitiesResponse.data.accounts || [];

    // Plaid bills per liabilitiesGet (one call returns the whole item), so this
    // single response updates EVERY linked debt on this item, not just the one
    // clicked — avoiding N separate billed calls when a user has several debts
    // at the same institution.
    const plaidItemId = debt.plaidItemId;
    const itemDebts = await prisma.debt.findMany({
      where: { userId, plaidItemId, isLinked: true, plaidAccountId: { not: null } },
    });

    const now = new Date();
    const recordedAt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    // Build per-debt updates from the single response. The current balance
    // lives on the ACCOUNT entry (accounts[].balances), not the liability row.
    // Skip debts Plaid gives no current balance for — don't overwrite a real
    // balance with 0/null.
    const updates = itemDebts.flatMap((d) => {
      const account = accounts.find(
        (acc: AccountBase) => acc.account_id === d.plaidAccountId
      );
      const newBalance = extractCurrentBalance(account);
      if (newBalance === null) return [];
      // If the balance grew past the recorded baseline (new charges since
      // linking), raise originalBalance so payoff/progress math stays consistent.
      return [{
        id: d.id,
        newBalance,
        newOriginalBalance: Math.max(d.originalBalance, newBalance),
      }];
    });

    // Atomic: each debt update + its this-month snapshot (mirrors the manual
    // edit path, or the Actual-vs-Projected chart diverges) + one item sync stamp.
    await prisma.$transaction(async (tx) => {
      for (const u of updates) {
        await tx.debt.update({
          where: { id: u.id },
          data: {
            balance: u.newBalance,
            originalBalance: u.newOriginalBalance,
            lastSyncedAt: now,
          },
        });
        await tx.balanceSnapshot.upsert({
          where: { debtId_recordedAt: { debtId: u.id, recordedAt } },
          update: { balance: u.newBalance },
          create: { debtId: u.id, userId, balance: u.newBalance, recordedAt },
        });
      }
      await tx.plaidItem.update({
        where: { id: plaidItemId },
        data: { lastSyncedAt: now },
      });
    });

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
