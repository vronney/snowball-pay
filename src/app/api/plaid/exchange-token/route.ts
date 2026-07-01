import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorized, tooManyRequests } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { limits } from '@/lib/rateLimit';
import { upgradeRequired } from '@/lib/gates';
import {
  plaidClient,
  logPlaidError,
  canUsePlaid,
  findLiabilityForAccount,
  extractInterestRate,
  extractCurrentBalance,
  extractCreditLimit,
  extractMinimumPayment,
  resolveInstitutionName,
} from '@/lib/plaid';
import { encryptToken, ensureTokenEncryptionReady } from '@/lib/plaidCrypto';

const ExchangeTokenSchema = z.object({
  publicToken: z.string().min(1),
});

/**
 * POST /api/plaid/exchange-token
 *
 * Exchanges Plaid public_token for access_token and fetches liabilities.
 * Stores the access_token ONCE on a PlaidItem row (keyed by Plaid item_id),
 * then imports each liability account as a Debt linked to that PlaidItem.
 */
export async function POST(request: NextRequest) {
  // From the exchange until the token row is persisted, the access token
  // exists only in memory. If we fail in that window without revoking it,
  // Plaid keeps the Item alive (and billable) with no stored copy to revoke
  // later — so the catch below calls itemRemove when we never got that far.
  let accessToken: string | undefined;
  let tokenPersisted = false;
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.valid || !auth.user) return unauthorized();

    const userId = auth.user.id;

    if (!(await canUsePlaid(userId, auth.user.email))) return upgradeRequired('Bank sync');

    if (!(await limits.plaidExchange(userId))) return tooManyRequests();

    const parsed = ExchangeTokenSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    const { publicToken } = parsed.data;

    // Fail BEFORE the exchange if the encryption key is missing/malformed —
    // otherwise we'd create a live, billable Item whose token we can't store.
    ensureTokenEncryptionReady();

    // Step 1: Exchange public_token for access_token
    const itemResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    accessToken = itemResponse.data.access_token;
    const itemId = itemResponse.data.item_id;

    // Step 1.5: accountsGet is NOT billed (unlike liabilitiesGet below), so use it
    // to catch a pure double-submit (retry, double-click on the same real login)
    // BEFORE the billed call. Match at the ACCOUNT level (persistent_account_id,
    // falling back to account_id), not institution — Plaid explicitly warns
    // against blocking by institution alone, since a user can have a second,
    // separate login at the same bank for different accounts (e.g. two credit
    // cards under different credentials). Only reject when EVERY incoming
    // account already belongs to a currently-linked debt under a different Item;
    // a partial overlap (some new, some already-linked accounts) is a legitimate
    // new connection and proceeds normally — the existing per-account matching
    // below already skips re-linking the accounts that are already active.
    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    const incomingAccounts = accountsResponse.data.accounts;

    const linkedDebts = await prisma.debt.findMany({
      where: { userId, isLinked: true, plaidItemId: { not: null } },
      select: { plaidAccountId: true, plaidPersistentAccountId: true },
    });
    const linkedPersistentIds = new Set(
      linkedDebts.map((d) => d.plaidPersistentAccountId).filter((v): v is string => !!v)
    );
    const linkedAccountIds = new Set(
      linkedDebts.map((d) => d.plaidAccountId).filter((v): v is string => !!v)
    );
    const isAlreadyLinked = (acc: { account_id: string; persistent_account_id?: string | null }) =>
      (!!acc.persistent_account_id && linkedPersistentIds.has(acc.persistent_account_id)) ||
      linkedAccountIds.has(acc.account_id);

    if (incomingAccounts.length > 0 && incomingAccounts.every(isAlreadyLinked)) {
      // Revoke the just-exchanged token immediately — we're not keeping it, and
      // an unrevoked token left lying around still risks getting billed later.
      try {
        await plaidClient.itemRemove({ access_token: accessToken });
      } catch (removeError) {
        // Revocation failed — do NOT drop our only copy of a live token.
        // Persist it (encrypted, no debts attached) so it can still be revoked
        // later (account deletion revokes every stored item).
        logPlaidError('Failed to remove duplicate-submission token:', removeError);
        await prisma.plaidItem.upsert({
          where: { itemId },
          create: { itemId, userId, accessToken: encryptToken(accessToken) },
          update: { accessToken: encryptToken(accessToken) },
        });
      }
      return NextResponse.json(
        { error: 'These accounts are already connected.' },
        { status: 409 }
      );
    }

    // Step 2: Fetch liabilities (debts) — the actual billed call.
    const liabilitiesResponse = await plaidClient.liabilitiesGet({
      access_token: accessToken,
    });

    const accounts = liabilitiesResponse.data.accounts || [];
    const liabilities = liabilitiesResponse.data.liabilities || {};
    const institutionName = await resolveInstitutionName(
      liabilitiesResponse.data.item?.institution_id
    );
    const institutionId = liabilitiesResponse.data.item?.institution_id ?? null;

    const now = new Date();

    // Defense-in-depth: Plaid item_ids are unique per Item so a cross-user
    // collision shouldn't be possible, but never silently overwrite another
    // user's row (and attach this user's debts to it) if one ever matched.
    const existingItem = await prisma.plaidItem.findUnique({
      where: { itemId },
      select: { userId: true },
    });
    if (existingItem && existingItem.userId !== userId) {
      console.error(
        `[plaid exchange] item_id collision: item ${itemId} already belongs to another user`
      );
      return NextResponse.json(
        { error: 'Failed to link account' },
        { status: 409 }
      );
    }

    // Step 3: Upsert a single PlaidItem row for this institution login.
    // The access_token lives here once — never duplicated onto each Debt — and
    // is encrypted at rest (it grants ongoing read access to the user's bank).
    const encryptedAccessToken = encryptToken(accessToken);
    const plaidItem = await prisma.plaidItem.upsert({
      where: { itemId },
      create: {
        itemId,
        userId,
        accessToken: encryptedAccessToken,
        institutionName,
        institutionId,
        lastSyncedAt: now,
      },
      update: {
        accessToken: encryptedAccessToken,
        lastSyncedAt: now,
        needsReauth: false, // a fresh link clears any prior re-auth flag
        ...(institutionName ? { institutionName } : {}),
        ...(institutionId ? { institutionId } : {}),
      },
    });
    tokenPersisted = true;

    // Step 4: Index the user's existing Plaid-associated debts so a re-link can
    // re-attach the same debt instead of duplicating it. account_id is only
    // stable WITHIN a Plaid Item, so after a disconnect+relink (which deletes the
    // old Item and mints new account_ids) we match on persistent_account_id —
    // stable across Items — and fall back to account_id for same-Item re-opens
    // and accounts Plaid gives no persistent id for.
    const existingDebts = await prisma.debt.findMany({
      where: {
        userId,
        OR: [
          { plaidAccountId: { not: null } },
          { plaidPersistentAccountId: { not: null } },
        ],
      },
      select: {
        id: true,
        isLinked: true,
        plaidAccountId: true,
        plaidPersistentAccountId: true,
      },
    });
    type ExistingDebt = (typeof existingDebts)[number];
    const byPersistent = new Map<string, ExistingDebt>();
    const byAccount = new Map<string, ExistingDebt>();
    for (const d of existingDebts) {
      if (d.plaidPersistentAccountId) byPersistent.set(d.plaidPersistentAccountId, d);
      if (d.plaidAccountId) byAccount.set(d.plaidAccountId, d);
    }
    const matchExisting = (
      persistentId: string | null | undefined,
      accountId: string
    ): ExistingDebt | undefined =>
      (persistentId ? byPersistent.get(persistentId) : undefined) ??
      byAccount.get(accountId);

    // Step 5: Partition incoming accounts. Skip accounts Plaid can't give a
    // current balance for — importing them as $0 would create a phantom
    // "paid off" debt. Re-attach matched debts that are currently UNLINKED
    // (e.g. previously disconnected); skip matches that are still linked & active
    // (don't orphan their Item or disturb them); create brand-new accounts.
    const toCreate: Prisma.DebtUncheckedCreateInput[] = [];
    const toRelink: {
      id: string;
      balance: number;
      accountId: string;
      persistentId: string | null;
    }[] = [];
    for (const account of accounts) {
      // Balance and limit live on the ACCOUNT (accounts[].balances); the
      // liability row only adds APR / minimum-payment detail. It's optional:
      // some supported subtypes (e.g. auto loans) get no liability row at all,
      // and skipping them would leave an account we're billed for unimported.
      const liability = findLiabilityForAccount(liabilities, account.account_id);

      const balance = extractCurrentBalance(account);
      if (balance === null) continue;

      const persistentId = account.persistent_account_id ?? null;
      const existing = matchExisting(persistentId, account.account_id);

      if (existing) {
        // Already linked & active under some Item — leave it; re-linking would
        // orphan its current Item (and leak a billed token).
        if (existing.isLinked) continue;
        toRelink.push({
          id: existing.id,
          balance,
          accountId: account.account_id,
          persistentId,
        });
        continue;
      }

      const minPayment = extractMinimumPayment(liability);
      const limit = extractCreditLimit(account);
      toCreate.push({
        userId,
        name: account.name || `${account.subtype} - ${account.mask}`,
        category: mapCategoryFromPlaid(account.subtype || ''),
        balance,
        originalBalance: balance,
        interestRate: extractInterestRate(liability),
        minimumPayment:
          minPayment !== null ? minPayment : Math.max(25, balance * 0.02),
        ...(limit !== undefined ? { creditLimit: limit } : {}),
        isLinked: true,
        plaidAccountId: account.account_id,
        plaidPersistentAccountId: persistentId,
        plaidItemId: plaidItem.id,
        lastSyncedAt: now,
      });
    }

    // Nothing to import (e.g. no qualifying accounts, or Plaid returned no
    // balances): don't keep a live, billable token for an item with no debts.
    // Guard on the debt count — the upsert's update branch can hit an existing
    // item that already has linked debts, which must stay untouched.
    if (toCreate.length + toRelink.length === 0) {
      const attachedDebts = await prisma.debt.count({
        where: { plaidItemId: plaidItem.id },
      });
      if (attachedDebts === 0) {
        try {
          await plaidClient.itemRemove({ access_token: accessToken });
          await prisma.plaidItem.delete({ where: { id: plaidItem.id } });
        } catch (removeError) {
          // Keep the row (it holds our only copy of the token) for a later
          // revocation attempt rather than stranding a live token.
          logPlaidError('Failed to remove empty-import token:', removeError);
        }
      }
      return NextResponse.json(
        { error: 'No debt accounts with balances were found at this bank.' },
        { status: 422 }
      );
    }

    // Atomic: creates + re-links together, so a partial failure rolls back.
    const createdDebts = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const data of toCreate) {
        created.push(await tx.debt.create({ data }));
      }
      // Re-attach: restore link + refresh balance and the (possibly new)
      // account_id, preserving the debt's id, history, and originalBalance.
      for (const r of toRelink) {
        await tx.debt.update({
          where: { id: r.id },
          data: {
            isLinked: true,
            plaidItemId: plaidItem.id,
            plaidAccountId: r.accountId,
            ...(r.persistentId ? { plaidPersistentAccountId: r.persistentId } : {}),
            lastSyncedAt: now,
            balance: r.balance,
          },
        });
      }
      return created;
    });

    return NextResponse.json({
      success: true,
      itemId,
      institutionName: institutionName || null,
      accountsLinked: accounts.length,
      // Total debts now linked from this flow (newly created + re-attached).
      debtsCreated: createdDebts.length + toRelink.length,
      debtsRelinked: toRelink.length,
      debts: createdDebts,
    });
  } catch (error) {
    logPlaidError('Error exchanging Plaid token:', error);
    // Best-effort revoke of a token we exchanged but never stored — otherwise
    // the Item stays live and billable with no copy left to revoke.
    if (accessToken && !tokenPersisted) {
      try {
        await plaidClient.itemRemove({ access_token: accessToken });
      } catch (removeError) {
        logPlaidError('Failed to revoke unpersisted token after error:', removeError);
      }
    }
    return NextResponse.json(
      { error: 'Failed to link account' },
      { status: 500 }
    );
  }
}

/**
 * Maps Plaid account subtypes to SnowballPay debt categories
 */
function mapCategoryFromPlaid(
  subtype: string
): 'Credit Card' | 'Student Loan' | 'Auto Loan' | 'Mortgage' | 'Personal Loan' | 'Medical Debt' | 'Other' {
  switch (subtype.toLowerCase()) {
    case 'credit card':
    case 'paypal':
      return 'Credit Card';
    case 'student':
      return 'Student Loan';
    case 'auto':
      return 'Auto Loan';
    case 'mortgage':
      return 'Mortgage';
    case 'personal':
      return 'Personal Loan';
    case 'medical':
      return 'Medical Debt';
    default:
      return 'Other';
  }
}
