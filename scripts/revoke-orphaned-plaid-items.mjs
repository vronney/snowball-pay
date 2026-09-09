#!/usr/bin/env node
/**
 * scripts/revoke-orphaned-plaid-items.mjs
 *
 * Revoke and delete PlaidItems that no longer have any debts attached.
 *
 * Why this exists: a PlaidItem row is the ONLY copy of its Plaid access
 * token. Deleting the row with SQL does not revoke anything — the token stays
 * live at Plaid, the accounts stay connected, and Plaid keeps billing
 * ($0.20 per connected account per month) with no handle left to stop it.
 * The order must always be: /item/remove FIRST, delete the row second.
 *
 * Orphans arise two ways, both observed in production 2026-09-09:
 *   1. exchange-token deliberately persists a bare row when its itemRemove
 *      call fails on a duplicate submission, precisely so the un-revoked
 *      token can be retried later. This script is that retry.
 *   2. A re-link that failed to match existing debts created a second Item
 *      for the same institution; cleaning up the duplicate debt left the new
 *      Item with nothing attached.
 *
 * Usage (runs against the DB in .env / .env.local — use `npm run db:use:prod`
 * or `db:use:dev` first to pick the environment):
 *
 *   # Dry run: list every orphan and what would happen. Changes nothing.
 *   node scripts/revoke-orphaned-plaid-items.mjs
 *
 *   # Execute
 *   node scripts/revoke-orphaned-plaid-items.mjs --yes
 *
 *   # Target a single item
 *   node scripts/revoke-orphaned-plaid-items.mjs --item <plaidItemId> --yes
 *
 *   # Widen or narrow the in-flight-link guard (default 60 minutes)
 *   node scripts/revoke-orphaned-plaid-items.mjs --min-age-minutes 15
 *
 *   # Revoke pre-encryption rows whose token is stored in plaintext
 *   node scripts/revoke-orphaned-plaid-items.mjs --allow-legacy-plaintext --yes
 *
 *   # Drop a row you have CONFIRMED in the Plaid dashboard is already gone
 *   node scripts/revoke-orphaned-plaid-items.mjs --item <id> --force-delete --yes
 *
 * PLAID_ENV must be set explicitly and must match the environment the stored
 * tokens belong to. Production tokens sent to sandbox come back as
 * INVALID_ACCESS_TOKEN, which is indistinguishable from "already revoked" —
 * so the script refuses to guess and makes you name the environment.
 *
 * Safety properties:
 *   - Dry run is the default. Nothing happens without --yes.
 *   - A row is deleted ONLY after Plaid confirms the removal SUCCEEDED. Any
 *     failure keeps the row, so the token stays revocable on a later run.
 *     Failing to clean up is recoverable; losing a live token is not.
 *   - No error code is ever read as proof the token is dead. ITEM_NOT_FOUND
 *     and INVALID_ACCESS_TOKEN both also mean "wrong environment"; deleting
 *     on those would destroy our only copy of a token that is still live and
 *     still billing. --force-delete covers the case where a human checked the
 *     dashboard and is asserting the item is genuinely gone.
 *   - Items newer than --min-age-minutes (default 60) are ignored entirely.
 *     exchange-token creates the Item BEFORE attaching its debts, so a link in
 *     flight looks exactly like an orphan; revoking one would kill a user's
 *     brand-new token. The zero-debt re-check at delete time cannot prevent
 *     that — the token is already gone by then — so the age floor, not the
 *     re-check, is what actually closes this race.
 *   - The zero-debt check is STILL re-asserted inside the delete, as a second
 *     line of defence for the row itself.
 *   - --force-delete requires --item. Without a selector it would skip
 *     revocation for every orphan at once, discarding unverified tokens.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createDecipheriv } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const prisma = new PrismaClient();

const flag = (name) => process.argv.includes(`--${name}`);
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const confirmed = flag('yes');
const onlyItem = arg('item');
const forceDelete = flag('force-delete');
const allowLegacyPlaintext = flag('allow-legacy-plaintext');

/**
 * Minimum age before a debt-less Item counts as an orphan.
 *
 * exchange-token creates the PlaidItem (route.ts:207) and attaches its debts
 * (route.ts:396) in separate steps, with liabilitiesGet and account matching
 * in between. For those seconds a live, in-flight link is indistinguishable
 * from an orphan. Revoking one there kills a user's brand-new token, and the
 * zero-debt re-check at delete time cannot save it: the token is already dead
 * by then, and the debts that just attached can never sync again.
 *
 * An age floor closes that window without coordinating with the linking
 * transaction. Real orphans are minutes-to-months old; an in-flight link is
 * seconds old.
 */
const DEFAULT_MIN_AGE_MINUTES = 60;
const parsedMinAge = Number.parseInt(arg('min-age-minutes') ?? '', 10);
const minAge =
  Number.isFinite(parsedMinAge) && parsedMinAge >= 0
    ? parsedMinAge
    : DEFAULT_MIN_AGE_MINUTES;

// --- Token decryption -------------------------------------------------------
// Mirrors src/lib/plaidCrypto.ts. Duplicated rather than imported because that
// module is TypeScript and this repo has no TS runner for scripts. Keep the
// two in step: format is enc:v1:<b64 iv>:<b64 tag>:<b64 ciphertext>, AES-256-GCM.
const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

function encryptionKey() {
  const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('PLAID_TOKEN_ENCRYPTION_KEY env var is not set');
  const buf = Buffer.from(raw, 'hex');
  if (buf.length !== 32) {
    throw new Error('PLAID_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
  }
  return buf;
}

function decryptToken(stored) {
  if (!stored.startsWith(PREFIX)) {
    throw new Error('Stored Plaid access token is not in the expected encrypted format');
  }
  const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split(':');
  const decipher = createDecipheriv(ALGO, encryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

// --- Plaid client -----------------------------------------------------------
// No default. A silent fallback to 'sandbox' while DATABASE_URL points at
// production means every revoke is sent to the wrong API with production
// tokens -- they get rejected, and any "treat rejection as already-dead"
// logic then deletes rows whose tokens are still live and still billing.
const plaidEnv = process.env.PLAID_ENV;
const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[plaidEnv ?? 'sandbox'],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
      },
    },
  })
);

/**
 * Deliberately absent: a set of "this means the token is already dead" error
 * codes. INVALID_ACCESS_TOKEN and ITEM_NOT_FOUND are BOTH also what Plaid
 * returns when a perfectly live token is presented to the wrong environment
 * (a production token sent to sandbox, say). Treating either as proof of
 * death would delete the row -- our only copy of the token -- while the real
 * token keeps its accounts connected and keeps billing, with nothing left to
 * revoke it with.
 *
 * The asymmetry decides it: keeping a dead row costs nothing and is fixed on
 * the next run; deleting a live token is permanent. So a row is deleted ONLY
 * after Plaid confirms the removal succeeded. Genuinely-dead rows are
 * reported and left for --force-delete, which is a human asserting they
 * checked the Plaid dashboard.
 */

function plaidErrorCode(error) {
  return error?.response?.data?.error_code ?? null;
}

function plaidErrorMessage(error) {
  const data = error?.response?.data;
  if (data?.error_message) return `${data.error_code}: ${data.error_message}`;
  return error?.message ?? String(error);
}

async function main() {
  for (const name of ['PLAID_CLIENT_ID', 'PLAID_SECRET', 'PLAID_TOKEN_ENCRYPTION_KEY']) {
    if (!process.env[name]) {
      console.error(`Missing ${name}. Cannot revoke tokens without it.`);
      process.exit(1);
    }
  }
  // Wrong key = every decrypt throws = zero revocations. Fail before the scan.
  encryptionKey();

  if (!plaidEnv || !PlaidEnvironments[plaidEnv]) {
    console.error(
      `PLAID_ENV must be set explicitly to one of: ${Object.keys(PlaidEnvironments).join(', ')}.`
    );
    console.error(
      `It is currently ${plaidEnv ? `"${plaidEnv}", which is not a Plaid environment` : 'unset'}.`
    );
    console.error(
      'Set it to the environment these tokens belong to. A production token sent'
    );
    console.error(
      'to sandbox returns INVALID_ACCESS_TOKEN, which reads exactly like "already'
    );
    console.error('revoked" and would hide a live, billing token.');
    process.exit(1);
  }

  if (forceDelete && !onlyItem) {
    console.error('--force-delete requires --item <plaidItemId>.');
    console.error(
      'It skips revocation entirely, so it is only valid for a single row whose'
    );
    console.error(
      'death you have confirmed in the Plaid dashboard. Without a selector it'
    );
    console.error(
      'would discard the tokens of every orphan at once, verified or not.'
    );
    process.exit(1);
  }

  const dbHost = (process.env.DATABASE_URL || '').split('@')[1]?.split('/')[0] ?? 'unknown';
  console.log(`Plaid env : ${plaidEnv}`);
  console.log(`Database  : ${dbHost}`);
  console.log(`Mode      : ${confirmed ? 'EXECUTE' : 'DRY RUN (nothing will change)'}\n`);

  console.log(`Min age   : ${minAge} minute(s) — younger rows may be links still in flight`);
  console.log();

  const cutoff = new Date(Date.now() - minAge * 60 * 1000);
  const items = await prisma.plaidItem.findMany({
    where: {
      ...(onlyItem ? { id: onlyItem } : {}),
      debts: { none: {} },
      createdAt: { lt: cutoff },
    },
    select: {
      id: true,
      itemId: true,
      userId: true,
      institutionName: true,
      accessToken: true,
      createdAt: true,
      lastSyncedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (items.length === 0) {
    console.log('No orphaned PlaidItems found. Nothing to do.');
    return;
  }

  console.log(`Found ${items.length} orphaned PlaidItem(s) — no debts attached:\n`);
  for (const item of items) {
    // The Plaid item_id is what the Plaid dashboard keys on, and the only way
    // to map a dashboard-confirmed dead Item back to a local row — exactly what
    // --force-delete asks the operator to have done. Two orphans at one
    // institution are indistinguishable without it.
    console.log(`  row ${item.id}`);
    console.log(`    plaid item_id : ${item.itemId}`);
    console.log(`    institution   : ${item.institutionName ?? '(unknown)'}`);
    console.log(`    user          : ${item.userId}`);
    console.log(
      `    created       : ${item.createdAt.toISOString()}  (last synced ${item.lastSyncedAt ? item.lastSyncedAt.toISOString() : 'never'})`
    );
  }
  console.log();

  if (!confirmed) {
    console.log('Dry run complete. Re-run with --yes to revoke and delete these.');
    return;
  }

  let revoked = 0;
  let forced = 0;
  let kept = 0;

  for (const item of items) {
    const label = `${item.id} (${item.institutionName ?? 'unknown'})`;

    if (forceDelete) {
      // The operator asserts this item is already gone at Plaid. No revoke is
      // attempted; the row is simply dropped.
      const dropped = await prisma.plaidItem.deleteMany({
        where: { id: item.id, debts: { none: {} } },
      });
      if (dropped.count === 1) {
        console.log(`  FORCED   ${label} — row deleted without revoking (operator asserted)`);
        forced += 1;
      } else {
        console.warn(`  SKIPPED  ${label} — row now has debts attached`);
        kept += 1;
      }
      continue;
    }

    let token;
    try {
      // Rows created before token encryption shipped (2026-06-26) hold the
      // access token in PLAINTEXT. decryptToken fails closed on those by
      // design, which leaves them permanently unrevocable through the app --
      // so a plaintext token just sits in the database forever. Revoking and
      // deleting the row is how that liability actually gets removed, hence
      // the opt-in flag rather than a hard refusal.
      if (allowLegacyPlaintext && !item.accessToken.startsWith('enc:v1:')) {
        token = item.accessToken;
        console.warn(`  LEGACY   ${label} — unencrypted token (pre-2026-06-26 row)`);
      } else {
        token = decryptToken(item.accessToken);
      }
    } catch (error) {
      // Undecryptable means we cannot revoke it, and deleting the row would
      // destroy the ciphertext a correct key could still recover.
      console.error(`  KEPT     ${label} — decrypt failed: ${error.message}`);
      kept += 1;
      continue;
    }

    let tokenIsGone = false;
    try {
      await plaidClient.itemRemove({ access_token: token });
      tokenIsGone = true;
      console.log(`  REVOKED  ${label}`);
      revoked += 1;
    } catch (error) {
      const code = plaidErrorCode(error);
      console.error(`  KEPT     ${label} — revoke failed: ${plaidErrorMessage(error)}`);
      const detail = error?.response?.data?.error_message ?? '';
      if (detail.includes('wrong Plaid environment')) {
        // Plaid named the problem outright: the token is fine, we asked the
        // wrong API. This is emphatically NOT a --force-delete case.
        console.error(
          `           WRONG ENVIRONMENT — this token is live, just not in "${plaidEnv}". Re-run with the correct PLAID_ENV. Do NOT --force-delete: that would strand a billing token.`
        );
      } else if (code === 'INVALID_ACCESS_TOKEN' || code === 'ITEM_NOT_FOUND') {
        console.error(
          `           ${code} means EITHER the item is already gone OR the token belongs to another Plaid environment (currently "${plaidEnv}"). Confirm in the Plaid dashboard before using --force-delete.`
        );
      }
      kept += 1;
      continue;
    }

    if (!tokenIsGone) continue;

    // Re-assert zero debts at delete time: a link could have attached one
    // between the scan and now, and deleting the Item would sever it.
    const deleted = await prisma.plaidItem.deleteMany({
      where: { id: item.id, debts: { none: {} } },
    });
    if (deleted.count === 0) {
      console.warn(
        `  WARNING  ${label} — token revoked but the row now has debts attached; row left in place. Those debts are no longer syncable and need a re-link.`
      );
    }
  }

  console.log(
    `\nDone. revoked=${revoked} force-deleted=${forced} kept-for-retry=${kept}`
  );
  if (kept > 0) {
    console.log('Rows kept still hold live tokens. Investigate, then re-run.');
  }
}

main()
  .catch((error) => {
    console.error('\nFailed:', error?.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
