import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorized, tooManyRequests } from '@/lib/auth-server';
import { limits } from '@/lib/rateLimit';
import { upgradeRequired } from '@/lib/gates';
import { logPlaidError, canUsePlaid } from '@/lib/plaid';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  CreditAccountSubtype,
  LoanAccountSubtype,
} from 'plaid';

// Initialize Plaid client
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

/**
 * POST /api/plaid/create-link-token
 *
 * Creates a Plaid Link token for the authenticated user.
 * Returns: { linkToken, expiration }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.valid || !auth.user) return unauthorized();

    const userId = auth.user.id;

    if (!(await canUsePlaid(userId, auth.user.email))) return upgradeRequired('Bank sync');

    if (!(await limits.plaidLinkToken(userId))) return tooManyRequests();

    // Create Link token
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'SnowballPay',
      language: 'en',
      products: [Products.Liabilities],
      country_codes: [CountryCode.Us],
      // Debt app: only surface credit + loan accounts. Depository (checking/
      // savings) is intentionally excluded to avoid linking accounts we'd be
      // billed for but can't use.
      account_filters: {
        credit: {
          account_subtypes: [
            CreditAccountSubtype.CreditCard,
            CreditAccountSubtype.Paypal,
          ],
        },
        loan: {
          account_subtypes: [
            LoanAccountSubtype.Auto,
            LoanAccountSubtype.Mortgage,
            LoanAccountSubtype.Student,
          ],
        },
      },
      // Redirect after OAuth (optional, Plaid Link handles mobile modally)
      ...(process.env.PLAID_REDIRECT_URI && {
        redirect_uri: process.env.PLAID_REDIRECT_URI,
      }),
      // Where Plaid POSTs item webhooks (e.g. ITEM_LOGIN_REQUIRED). Set per Item
      // at link time; leave unset in dev where there's no public callback URL.
      ...(process.env.PLAID_WEBHOOK_URL && {
        webhook: process.env.PLAID_WEBHOOK_URL,
      }),
    });

    return NextResponse.json({
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    logPlaidError('Error creating Plaid link token:', error);
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    );
  }
}
