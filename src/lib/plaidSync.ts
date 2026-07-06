import type { AccountBase } from 'plaid';
import { prisma } from '@/lib/prisma';
import { plaidClient, extractCurrentBalance } from '@/lib/plaid';
import { decryptToken } from '@/lib/plaidCrypto';

export interface PlaidBalanceUpdate {
  id: string;
  newBalance: number;
  newOriginalBalance: number;
}

export interface PlaidItemSyncResult {
  /** Raw Plaid accounts from the liabilities response (for per-account lookups). */
  accounts: AccountBase[];
  /** The per-debt updates that were applied. */
  updates: PlaidBalanceUpdate[];
  /** Timestamp stamped on the debts and the item as lastSyncedAt. */
  syncedAt: Date;
}

/**
 * Pull fresh liability balances for one PlaidItem and apply them to every
 * linked debt on that item.
 *
 * Shared by the user-initiated refresh (POST /api/plaid/refresh-debt) and the
 * Plaid webhook (LIABILITIES/DEFAULT_UPDATE), so both paths keep identical
 * snapshot and sync-stamp semantics.
 *
 * Plaid bills per liabilitiesGet (one call returns the whole item), so a
 * single call here updates EVERY linked debt on the item — never one call per
 * debt.
 */
export async function syncPlaidItemBalances(item: {
  id: string;
  userId: string;
  accessToken: string;
}): Promise<PlaidItemSyncResult> {
  const accessToken = decryptToken(item.accessToken);

  const liabilitiesResponse = await plaidClient.liabilitiesGet({
    access_token: accessToken,
  });
  const accounts = liabilitiesResponse.data.accounts || [];

  const itemDebts = await prisma.debt.findMany({
    where: {
      userId: item.userId,
      plaidItemId: item.id,
      isLinked: true,
      plaidAccountId: { not: null },
    },
  });

  const now = new Date();
  const recordedAt = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  // Build per-debt updates from the single response. The current balance
  // lives on the ACCOUNT entry (accounts[].balances), not the liability row.
  // Skip debts Plaid gives no current balance for — don't overwrite a real
  // balance with 0/null.
  const updates: PlaidBalanceUpdate[] = itemDebts.flatMap((d) => {
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
      // Re-assert ownership/linkage inside the transaction: itemDebts was read
      // outside it, so a debt disconnected or re-assigned in the gap must not
      // be overwritten (updateMany is a no-op then, unlike update which throws
      // only on missing ids, not on stale linkage).
      const updated = await tx.debt.updateMany({
        where: {
          id: u.id,
          userId: item.userId,
          plaidItemId: item.id,
          isLinked: true,
        },
        data: {
          balance: u.newBalance,
          originalBalance: u.newOriginalBalance,
          lastSyncedAt: now,
        },
      });
      // Debt no longer eligible — skip its snapshot too.
      if (updated.count === 0) continue;
      await tx.balanceSnapshot.upsert({
        where: { debtId_recordedAt: { debtId: u.id, recordedAt } },
        update: { balance: u.newBalance },
        create: {
          debtId: u.id,
          userId: item.userId,
          balance: u.newBalance,
          recordedAt,
        },
      });
    }
    // A successful liabilitiesGet proves the login works again — clear any
    // stale re-auth flag so the reconnect banner doesn't linger.
    await tx.plaidItem.update({
      where: { id: item.id },
      data: { lastSyncedAt: now, needsReauth: false },
    });
  });

  return { accounts, updates, syncedAt: now };
}
