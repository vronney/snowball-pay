#!/usr/bin/env node
/**
 * scripts/merge-duplicate-debts.mjs
 *
 * Merge a freshly imported (Plaid-linked) duplicate debt INTO an existing
 * manual debt, preserving the manual debt's id and therefore its months of
 * balance snapshots and payment records.
 *
 * Why this exists: linking a bank imports its accounts as new debts. The
 * import dedupes on Plaid account ids, so it cannot know that a manually
 * tracked debt is the same card — users who tracked a card by hand before
 * linking end up with two rows. Deleting the manual one would discard its
 * history; this script moves the Plaid link onto it instead.
 *
 * Usage (run against the DB in .env / .env.local — use npm run db:use:prod
 * or db:use:dev first to pick the environment):
 *
 *   # 1. List a user's debts with ids and history counts
 *   node scripts/merge-duplicate-debts.mjs --user you@example.com
 *
 *   # 2. Dry-run a merge (shows the plan, writes nothing)
 *   node scripts/merge-duplicate-debts.mjs --keep <manualDebtId> --absorb <importedDebtId>
 *
 *   # 3. Execute it
 *   node scripts/merge-duplicate-debts.mjs --keep <id> --absorb <id> --yes
 *
 * What a merge does (single transaction):
 *   - moves the absorbed debt's payment records and balance snapshots onto
 *     the kept debt (on same-month snapshot collisions, the linked debt's
 *     bank-reported balance wins)
 *   - moves the Plaid link (item, account ids, isLinked, lastSyncedAt) from
 *     the absorbed debt onto the kept debt
 *   - takes the bank-reported balance; fills interestRate / creditLimit only
 *     where the kept debt has none (0), never overwriting user-entered values
 *   - deletes the absorbed debt row
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const flag = (name) => process.argv.includes(`--${name}`);

const userEmail = arg('user');
const keepId = arg('keep');
const absorbId = arg('absorb');
const confirmed = flag('yes');

async function listDebts(email) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error(`No user found for email: ${email}`);
    process.exit(1);
  }
  const debts = await prisma.debt.findMany({
    where: { userId: user.id },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { snapshots: true, paymentRecords: true } } },
  });
  console.log(`\nDebts for ${user.email}:\n`);
  for (const d of debts) {
    console.log(
      [
        d.id,
        `"${d.name}"`,
        `$${d.balance.toFixed(2)}`,
        `${d.interestRate}% APR`,
        d.isLinked ? 'LINKED' : 'manual',
        `${d._count.snapshots} snapshots`,
        `${d._count.paymentRecords} payments`,
        `created ${d.createdAt.toISOString().slice(0, 10)}`,
      ].join('  |  ')
    );
  }
  console.log(
    '\nPick the debt with history as --keep and the freshly imported duplicate as --absorb.'
  );
}

async function merge(keep, absorb, execute) {
  if (keep.userId !== absorb.userId) {
    console.error('Debts belong to different users — refusing to merge.');
    process.exit(1);
  }
  if (keep.id === absorb.id) {
    console.error('--keep and --absorb are the same debt.');
    process.exit(1);
  }
  if (keep.isLinked && absorb.isLinked) {
    console.error(
      'Both debts are Plaid-linked. Disconnect one first — merging two live links is ambiguous.'
    );
    process.exit(1);
  }

  const linkSource = absorb.isLinked ? absorb : null;
  const [absorbSnapshots, absorbPayments] = await Promise.all([
    prisma.balanceSnapshot.findMany({ where: { debtId: absorb.id } }),
    prisma.paymentRecord.count({ where: { debtId: absorb.id } }),
  ]);

  console.log(`\nMerge plan:`);
  console.log(`  KEEP   ${keep.id}  "${keep.name}"  ($${keep.balance.toFixed(2)}, ${keep.isLinked ? 'linked' : 'manual'})`);
  console.log(`  ABSORB ${absorb.id}  "${absorb.name}"  ($${absorb.balance.toFixed(2)}, ${absorb.isLinked ? 'linked' : 'manual'})`);
  console.log(`  - move ${absorbPayments} payment record(s) and ${absorbSnapshots.length} snapshot(s) to the kept debt`);
  console.log(`    (same-month collisions: payment amounts are combined; snapshots keep the bank value)`);
  if (linkSource) {
    console.log(`  - move Plaid link (item ${linkSource.plaidItemId}) onto the kept debt`);
    console.log(`  - set kept balance to bank-reported $${linkSource.balance.toFixed(2)}`);
  }
  if (keep.interestRate === 0 && absorb.interestRate > 0)
    console.log(`  - fill interestRate from absorbed debt: ${absorb.interestRate}%`);
  if (keep.creditLimit === 0 && absorb.creditLimit > 0)
    console.log(`  - fill creditLimit from absorbed debt: $${absorb.creditLimit.toFixed(2)}`);
  console.log(`  - delete the absorbed debt row`);

  if (!execute) {
    console.log('\nDry run — nothing written. Re-run with --yes to execute.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    // History first. Payment records are unique per (debtId, dueYear,
    // dueMonth) — when BOTH duplicates logged a payment for the same month,
    // those were two real payments toward the same card, so combine the
    // amounts on the kept record instead of violating the constraint.
    const absorbPaymentRecords = await tx.paymentRecord.findMany({
      where: { debtId: absorb.id },
    });
    for (const rec of absorbPaymentRecords) {
      const existing = await tx.paymentRecord.findUnique({
        where: {
          debtId_dueYear_dueMonth: {
            debtId: keep.id,
            dueYear: rec.dueYear,
            dueMonth: rec.dueMonth,
          },
        },
      });
      if (!existing) {
        await tx.paymentRecord.update({
          where: { id: rec.id },
          data: { debtId: keep.id },
        });
      } else {
        await tx.paymentRecord.update({
          where: { id: existing.id },
          data: { amount: existing.amount + rec.amount },
        });
        // rec stays on the absorbed debt and dies with it (cascade delete).
      }
    }
    // Snapshots upsert so a same-month collision keeps one row (bank value
    // wins when the absorbed debt is the linked one — that number came from
    // the institution). Re-read inside the transaction: the pre-transaction
    // list above is only for the dry-run plan, and a snapshot written in the
    // window since (e.g. a concurrent sync) would otherwise be cascade-deleted
    // unmoved.
    const txAbsorbSnapshots = await tx.balanceSnapshot.findMany({
      where: { debtId: absorb.id },
    });
    for (const snap of txAbsorbSnapshots) {
      const existing = await tx.balanceSnapshot.findUnique({
        where: { debtId_recordedAt: { debtId: keep.id, recordedAt: snap.recordedAt } },
      });
      if (!existing) {
        await tx.balanceSnapshot.update({
          where: { id: snap.id },
          data: { debtId: keep.id },
        });
      } else if (linkSource) {
        await tx.balanceSnapshot.update({
          where: { id: existing.id },
          data: { balance: snap.balance },
        });
      }
      // else: keep's snapshot stands; absorb's copy dies with the row below.
    }

    // Clear the link on the absorbed row BEFORE setting it on the kept row —
    // (userId, plaidAccountId) is unique.
    const link = linkSource
      ? {
          isLinked: linkSource.isLinked,
          plaidAccountId: linkSource.plaidAccountId,
          plaidPersistentAccountId: linkSource.plaidPersistentAccountId,
          plaidItemId: linkSource.plaidItemId,
          lastSyncedAt: linkSource.lastSyncedAt,
        }
      : null;
    if (link) {
      await tx.debt.update({
        where: { id: absorb.id },
        data: {
          isLinked: false,
          plaidAccountId: null,
          plaidPersistentAccountId: null,
          plaidItemId: null,
        },
      });
    }

    await tx.debt.update({
      where: { id: keep.id },
      data: {
        ...(link ?? {}),
        ...(link ? { balance: linkSource.balance } : {}),
        ...(keep.interestRate === 0 && absorb.interestRate > 0
          ? { interestRate: absorb.interestRate }
          : {}),
        ...(keep.creditLimit === 0 && absorb.creditLimit > 0
          ? { creditLimit: absorb.creditLimit }
          : {}),
        // The kept debt's originalBalance anchors its progress history; only
        // raise it if the bank reports MORE owed than we ever recorded.
        ...(link && linkSource.balance > keep.originalBalance
          ? { originalBalance: linkSource.balance }
          : {}),
      },
    });

    await tx.debt.delete({ where: { id: absorb.id } });
  });

  console.log('\nMerged. The kept debt now carries the history and the bank link.');
}

async function main() {
  if (userEmail && !keepId && !absorbId) {
    await listDebts(userEmail);
  } else if (keepId && absorbId) {
    const [keep, absorb] = await Promise.all([
      prisma.debt.findUnique({ where: { id: keepId } }),
      prisma.debt.findUnique({ where: { id: absorbId } }),
    ]);
    if (!keep) {
      console.error(`--keep debt not found: ${keepId}`);
      process.exit(1);
    }
    if (!absorb) {
      console.error(`--absorb debt not found: ${absorbId}`);
      process.exit(1);
    }
    await merge(keep, absorb, confirmed);
  } else {
    console.log(
      'Usage:\n' +
        '  node scripts/merge-duplicate-debts.mjs --user <email>            # list debts\n' +
        '  node scripts/merge-duplicate-debts.mjs --keep <id> --absorb <id> # dry-run merge\n' +
        '  node scripts/merge-duplicate-debts.mjs --keep <id> --absorb <id> --yes'
    );
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
