import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorized, tooManyRequests } from '@/lib/auth-server';
import { limits } from '@/lib/rateLimit';
import { upgradeRequired } from '@/lib/gates';
import { prisma } from '@/lib/prisma';
import { setMfaRequired } from '@/lib/auth0-management';
import {
  plaidClient,
  logPlaidError,
  canUsePlaid,
  hasReachedPlaidItemLimit,
  PLAID_ITEM_LIMIT_MESSAGE,
} from '@/lib/plaid';
import {
  Products,
  CountryCode,
  CreditAccountSubtype,
  LoanAccountSubtype,
} from 'plaid';

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

    // Cost guardrail: don't even open Link past the per-user institution cap.
    if (await hasReachedPlaidItemLimit(userId)) {
      return NextResponse.json({ error: PLAID_ITEM_LIMIT_MESSAGE }, { status: 409 });
    }

    // INFOSEC policy: MFA is enabled for consumers prior to surfacing Plaid
    // Link. Flag the Auth0 account (idempotent); the Conditional MFA Action
    // challenges from the next login on. Also covers allowlisted testers who
    // reach Plaid without a Pro subscription. Runs concurrently with link
    // creation and never blocks it: the flag only affects future logins, so
    // an Auth0 hiccup shouldn't fail bank linking.
    const mfaFlagPromise = prisma.user
      .findUnique({ where: { id: userId }, select: { auth0Id: true } })
      .then((user) => (user ? setMfaRequired(user.auth0Id) : undefined))
      .catch((error) => {
        console.error('Error setting mfa_required before Plaid Link:', error);
      });

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

    // Settle before responding — serverless may freeze un-awaited work after
    // the response returns. Errors were already caught above.
    await mfaFlagPromise;

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
