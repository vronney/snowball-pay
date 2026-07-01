import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorized, isValidId, tooManyRequests } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { limits } from '@/lib/rateLimit';
import { upgradeRequired } from '@/lib/gates';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  CountryCode,
} from 'plaid';
import { decryptToken } from '@/lib/plaidCrypto';
import { logPlaidError, canUsePlaid } from '@/lib/plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

const UpdateLinkTokenSchema = z.object({
  plaidItemId: z.string().min(1),
});

/**
 * POST /api/plaid/update-link-token
 *
 * Creates a Plaid Link token in UPDATE MODE for an existing item (one whose
 * login expired — `needsReauth`). Passing the existing `access_token` and NO
 * products puts Link in update mode: the user re-authenticates and the SAME
 * Item is repaired, preserving its debts and payment history. (A fresh link
 * would create a new Item and duplicate the debts.)
 *
 * Returns: { linkToken }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid || !auth.user) return unauthorized();
    if (!(await canUsePlaid(auth.user.id, auth.user.email))) return upgradeRequired('Bank sync');

    if (!(await limits.plaidLinkToken(auth.user.id))) return tooManyRequests();

    const parsed = UpdateLinkTokenSchema.safeParse(await request.json());
    if (!parsed.success || !isValidId(parsed.data.plaidItemId)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Load the item and verify ownership before touching its token.
    const plaidItem = await prisma.plaidItem.findUnique({
      where: { id: parsed.data.plaidItemId },
    });
    if (!plaidItem || plaidItem.userId !== auth.user.id) {
      return NextResponse.json(
        { error: 'Plaid item not found or unauthorized' },
        { status: 404 }
      );
    }

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: auth.user.id },
      client_name: 'SnowballPay',
      language: 'en',
      country_codes: [CountryCode.Us],
      // Update mode: no `products`/`account_filters`, just the existing token.
      access_token: decryptToken(plaidItem.accessToken),
      ...(process.env.PLAID_REDIRECT_URI && {
        redirect_uri: process.env.PLAID_REDIRECT_URI,
      }),
      ...(process.env.PLAID_WEBHOOK_URL && {
        webhook: process.env.PLAID_WEBHOOK_URL,
      }),
    });

    return NextResponse.json({ linkToken: response.data.link_token });
  } catch (error) {
    logPlaidError('Error creating Plaid update link token:', error);
    return NextResponse.json(
      { error: 'Failed to create update link token' },
      { status: 500 }
    );
  }
}
