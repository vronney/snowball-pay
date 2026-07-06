import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { limits } from '@/lib/rateLimit';
import { verifyPlaidWebhook } from '@/lib/plaidWebhook';
import { syncPlaidItemBalances } from '@/lib/plaidSync';
import { logPlaidError, canUsePlaid } from '@/lib/plaid';

// Verify the raw signature against the exact bytes Plaid sent — disable any
// body parsing and read the body as text.
export const runtime = 'nodejs';

interface PlaidWebhookBody {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  error?: { error_code?: string } | null;
}

// Item webhook codes that mean "this login can no longer be used until the user
// re-authenticates" — we flag the item so the UI can prompt a re-link.
const REAUTH_CODES = new Set([
  'PENDING_EXPIRATION', // consent window closing
  'PENDING_DISCONNECT', // institution scheduled to disconnect this Item soon
  'USER_PERMISSION_REVOKED',
  'USER_ACCOUNT_REVOKED',
]);

/**
 * POST /api/plaid/webhooks
 *
 * Receives Plaid webhooks. Verifies the Plaid-Verification JWT before acting,
 * then flags PlaidItems that need re-authentication. Always returns 200 once
 * verified (even for unhandled types) so Plaid doesn't retry indefinitely;
 * returns 400 only when the signature can't be verified.
 */
export async function POST(request: NextRequest) {
  // Public, unauthenticated route — rate-limit by IP before doing any work
  // (signature verification can trigger an outbound key fetch to Plaid).
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!(await limits.plaidWebhookIp(ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const rawBody = await request.text();

  const verified = await verifyPlaidWebhook(
    rawBody,
    request.headers.get('plaid-verification')
  );
  if (!verified) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let body: PlaidWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { webhook_type, webhook_code, item_id } = body;

  try {
    if (webhook_type === 'ITEM' && item_id) {
      // ITEM_LOGIN_REQUIRED arrives as an ERROR webhook; others as their own code.
      const needsReauth =
        (webhook_code === 'ERROR' &&
          body.error?.error_code === 'ITEM_LOGIN_REQUIRED') ||
        (webhook_code !== undefined && REAUTH_CODES.has(webhook_code));

      if (needsReauth) {
        // updateMany (not update) — the webhook item_id may not match a row we
        // hold (already disconnected); updateMany is a no-op rather than a throw.
        await prisma.plaidItem.updateMany({
          where: { itemId: item_id },
          data: { needsReauth: true },
        });
      }

      // LOGIN_REPAIRED fires when the Item is fixed — including by means other
      // than our own update-mode flow (e.g. the user re-authenticates via
      // another app, or Plaid auto-detects repair). Clear the banner here too,
      // not just via the client-driven clear-reauth call after a successful
      // Link session, so a repair we didn't initiate doesn't leave a stale
      // "reconnect needed" prompt showing.
      if (webhook_code === 'LOGIN_REPAIRED') {
        await prisma.plaidItem.updateMany({
          where: { itemId: item_id },
          data: { needsReauth: false },
        });
      }
    }

    // Plaid has fresh liability data for this item (fires when it detects
    // changed balances/APRs after its scheduled pull from the bank). Sync all
    // linked debts now so balances update without the user clicking refresh —
    // e.g. a card payment drops the balance here once the bank posts it.
    if (
      webhook_type === 'LIABILITIES' &&
      webhook_code === 'DEFAULT_UPDATE' &&
      item_id
    ) {
      const item = await prisma.plaidItem.findUnique({
        where: { itemId: item_id },
        include: { user: { select: { email: true } } },
      });
      // Same gate as the manual refresh: every liabilitiesGet is billed, so
      // items whose owner is no longer Plaid-eligible (e.g. downgraded from
      // Pro after linking) must not keep syncing on the bank's schedule.
      const eligible =
        item && (await canUsePlaid(item.userId, item.user.email));
      if (item && eligible) {
        try {
          await syncPlaidItemBalances(item);
        } catch (error) {
          // Ack with 200 anyway: a failed pull (e.g. login expired between
          // the webhook firing and now) won't be fixed by Plaid re-sending
          // the same webhook, and the manual refresh path still works.
          logPlaidError(
            `[plaid webhook] balance sync failed for item ${item.id}:`,
            error
          );
        }
      }
    }
    // Other types: acknowledged, no action.
  } catch (error) {
    console.error(
      `[plaid webhook] handler error for ${webhook_type}/${webhook_code}:`,
      error
    );
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
