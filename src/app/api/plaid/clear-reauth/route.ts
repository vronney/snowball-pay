import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorized, isValidId, tooManyRequests } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { limits } from '@/lib/rateLimit';
import { plaidClient, logPlaidError } from '@/lib/plaid';
import { decryptToken } from '@/lib/plaidCrypto';

const ClearReauthSchema = z.object({
  plaidItemId: z.string().min(1),
});

/**
 * POST /api/plaid/clear-reauth
 *
 * Called after a successful Plaid Link update-mode flow. Confirms the item's
 * access token actually works again (a real liabilitiesGet call) before
 * clearing `needsReauth` — so we never mark an item healthy on a false signal.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid || !auth.user) return unauthorized();

    if (!(await limits.plaidSync(auth.user.id))) return tooManyRequests();

    const parsed = ClearReauthSchema.safeParse(await request.json());
    if (!parsed.success || !isValidId(parsed.data.plaidItemId)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const plaidItem = await prisma.plaidItem.findUnique({
      where: { id: parsed.data.plaidItemId },
    });
    if (!plaidItem || plaidItem.userId !== auth.user.id) {
      return NextResponse.json(
        { error: 'Plaid item not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify the token is usable again. itemGet is NOT billed per-account (unlike
    // liabilitiesGet) and exposes item.error — ITEM_LOGIN_REQUIRED clears to null
    // once re-auth succeeds — which is the exact yes/no signal we need here.
    try {
      const itemResponse = await plaidClient.itemGet({
        access_token: decryptToken(plaidItem.accessToken),
      });
      if (itemResponse.data.item?.error) {
        return NextResponse.json(
          { error: 'Re-authentication did not restore access' },
          { status: 422 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Re-authentication did not restore access' },
        { status: 422 }
      );
    }

    await prisma.plaidItem.update({
      where: { id: plaidItem.id },
      data: { needsReauth: false, lastSyncedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logPlaidError('Error clearing Plaid re-auth flag:', error);
    return NextResponse.json(
      { error: 'Failed to clear re-auth flag' },
      { status: 500 }
    );
  }
}
