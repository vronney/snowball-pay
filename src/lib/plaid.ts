import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  CountryCode,
  type AccountBase,
  type LiabilitiesObject,
} from 'plaid';
import { hasPaidPro } from '@/lib/gates';
import { isDebtBankLinked } from '@/lib/debtHelpers';
import { prisma } from '@/lib/prisma';

/**
 * Shared Plaid client.
 *
 * Plaid bills per ACCOUNT (not per institution-login / Item). One bank login
 * ("Item") can contain many accounts. The access_token is therefore stored once
 * per Item (see the PlaidItem model) rather than redundantly per Debt.
 */
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

/**
 * Log a Plaid-related error without the raw exception object. Plaid API
 * errors are axios-based and carry the outbound request config — including
 * the PLAID-CLIENT-ID/PLAID-SECRET headers set above — as an enumerable
 * property, so `console.error('...', error)` risks leaking those credentials
 * into logs on every failed call. Log only the message and Plaid's own
 * (non-secret) error body.
 */
export function logPlaidError(context: string, error: unknown): void {
  const err = error as { message?: unknown; response?: { data?: unknown } } | undefined;
  console.error(context, {
    message: typeof err?.message === 'string' ? err.message : String(error),
    plaidError: err?.response?.data,
  });
}

/**
 * Manual override list — emails on this list get Plaid access regardless of
 * subscription status (testers, loyal customers as a perk). Fails closed if
 * unset: an empty/missing list overrides nothing, it doesn't open anything.
 *
 * Set PLAID_ALLOWED_EMAILS to the literal value "*" to bypass the Pro
 * requirement for EVERY user, paying or not. This is a deliberate escape
 * hatch (e.g. a promo), not the normal way to "launch to everyone" — once
 * Plaid is ready for general availability, the intended path is to just let
 * `canUsePlaid` fall through to the Pro check below and keep this list short
 * (or empty). Leaving "*" set here would mean Free users get Plaid for free
 * indefinitely, silently undermining the Pro paywall.
 */
export function isPlaidAllowed(email: string | null | undefined): boolean {
  const allowlist = process.env.PLAID_ALLOWED_EMAILS;
  if (!allowlist || !email) return false;
  if (allowlist.trim() === '*') return true;
  const normalized = email.trim().toLowerCase();
  return allowlist
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

/**
 * The real production gate: a user can use Plaid if they're a PAYING Pro
 * subscriber, OR their email is on the manual override list above. Every
 * Plaid call costs real money (see the Contracts & Rates note — $0.20 per
 * connected account/month), so access must be tied to payment once this
 * leaves the allowlist-only testing stage. Deliberately hasPaidPro, not
 * isPro: the free signup window grants Pro features but has no card on
 * file, and must not open metered Plaid spend.
 *
 * plaidAccessAllowed is the same rule for callers that already hold a paid
 * verdict (e.g. the subscription endpoint's single-read BillingVerdict) —
 * canUsePlaid delegates to it so the rule has one definition.
 */
export function plaidAccessAllowed(
  email: string | null | undefined,
  paidPro: boolean
): boolean {
  return isPlaidAllowed(email) || paidPro;
}

export async function canUsePlaid(
  userId: string,
  email: string | null | undefined
): Promise<boolean> {
  // Allowlist short-circuits BEFORE the billing lookup: allowlisted testers
  // must keep access even when the billing read is slow or failing.
  if (isPlaidAllowed(email)) return true;
  return plaidAccessAllowed(email, await hasPaidPro(userId));
}

/**
 * Cost guardrail: cap institution logins (Items) per user. Plaid bills per
 * connected ACCOUNT per month, and one hostile or confused trialer linking
 * everything they can find turns into real spend with no matching revenue.
 *
 * This is anti-abuse, not product segmentation — it must sit ABOVE the
 * heaviest legitimate user (production data 2026-07: a real account has 7
 * institutions), so the default is 10. The check only blocks ADDING a new
 * institution; users already over a lowered cap keep everything they have.
 * Override per environment with PLAID_MAX_ITEMS_PER_USER — no deploy needed.
 */
const DEFAULT_MAX_PLAID_ITEMS_PER_USER = 10;

export const MAX_PLAID_ITEMS_PER_USER = (() => {
  const parsed = Number.parseInt(process.env.PLAID_MAX_ITEMS_PER_USER ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_PLAID_ITEMS_PER_USER;
})();

export async function hasReachedPlaidItemLimit(userId: string): Promise<boolean> {
  const count = await prisma.plaidItem.count({ where: { userId } });
  const reached = count >= MAX_PLAID_ITEMS_PER_USER;
  if (reached) {
    // Ops signal: a legit user hitting this is a reason to raise the cap.
    console.warn('[plaid] item cap reached', { userId, count, cap: MAX_PLAID_ITEMS_PER_USER });
  }
  return reached;
}

export const PLAID_ITEM_LIMIT_MESSAGE =
  `You can link up to ${MAX_PLAID_ITEMS_PER_USER} institutions. Disconnect one you no longer use, ` +
  `or email support@getsnowballpay.com and we'll raise your limit — it's a fraud guard, not a plan limit.`;

/**
 * Whether a debt's balance math is deferred to Plaid sync right now: linked
 * AND its owner can still sync (Pro or allowlist). After a Pro → free
 * downgrade the link is dormant, so the debt behaves like a manual one.
 *
 * The single source of truth for the payment routes (log/edit/delete) — they
 * must all branch on this same rule, or a payment logged in one mode could be
 * reversed in the other. Evaluated at operation time; if the tier changes
 * between logging and editing, the next sync after a re-upgrade restores bank
 * truth.
 */
export async function isDebtBalanceBankManaged(
  debt:
    | { isLinked?: boolean | null; plaidItemId?: string | null; userId: string }
    | null
    | undefined,
  email: string | null | undefined
): Promise<boolean> {
  if (!debt || !isDebtBankLinked(debt)) return false;
  return canUsePlaid(debt.userId, email);
}

/**
 * The `liabilities` object returned by `liabilitiesGet` is keyed by liability
 * TYPE ('credit' | 'student' | 'mortgage'), NOT by account subtype. Each
 * liability entry carries its own `account_id`, so to find the liability for a
 * given account we must flatten all three arrays and match on `account_id`.
 *
 * Plaid's TS types for the liabilities sub-objects are loose, so we treat each
 * flattened entry as a permissive record.
 */
type PlaidLiability = Record<string, unknown> & { account_id?: string };

const LIABILITY_KEYS = ['credit', 'student', 'mortgage'] as const;

/**
 * Flatten the credit/student/mortgage liability arrays into a single list.
 */
export function flattenLiabilities(
  liabilities: LiabilitiesObject | Record<string, unknown> | null | undefined
): PlaidLiability[] {
  if (!liabilities) return [];
  const flat: PlaidLiability[] = [];
  for (const key of LIABILITY_KEYS) {
    const arr = (liabilities as Record<string, unknown>)[key];
    if (Array.isArray(arr)) {
      flat.push(...(arr as PlaidLiability[]));
    }
  }
  return flat;
}

/**
 * Find the liability object that matches a given Plaid account_id by flattening
 * all liability type arrays and matching on `account_id`.
 */
export function findLiabilityForAccount(
  liabilities: LiabilitiesObject | Record<string, unknown> | null | undefined,
  accountId: string | null | undefined
): PlaidLiability | undefined {
  if (!accountId) return undefined;
  return flattenLiabilities(liabilities).find((l) => l.account_id === accountId);
}

/**
 * Extract an interest rate (APR, in percentage) from a Plaid liability object.
 *
 * - Credit card liabilities expose APRs via an `aprs` array; each element has
 *   `apr_percentage` and `apr_type`. We prefer the balance-carrying / purchase
 *   APR (apr_type containing "balance" or "purchase"), else fall back to the
 *   first entry's `apr_percentage`.
 * - Student loans expose `interest_rate_percentage` (a number).
 * - Mortgages expose `interest_rate` as a `{ percentage }` object, NOT
 *   `interest_rate_percentage` — read the nested `.percentage`.
 * - Falls back to 0 when nothing usable is found.
 *
 * Defensive throughout because Plaid's TS types here are loose.
 */
export function extractInterestRate(
  liability: PlaidLiability | null | undefined
): number {
  if (!liability) return 0;

  const aprs = liability.aprs;
  if (Array.isArray(aprs) && aprs.length > 0) {
    const preferred = aprs.find((a: Record<string, unknown>) => {
      const type = String(a?.apr_type ?? '').toLowerCase();
      return type.includes('balance') || type.includes('purchase');
    });
    const chosen = preferred ?? aprs[0];
    const pct = (chosen as Record<string, unknown>)?.apr_percentage;
    if (typeof pct === 'number') return pct;
  }

  // Student loans
  const studentRate = liability.interest_rate_percentage;
  if (typeof studentRate === 'number') return studentRate;

  // Mortgages: interest_rate is a MortgageInterestRate object with `.percentage`
  const mortgageRate = (liability.interest_rate as Record<string, unknown> | undefined)
    ?.percentage;
  if (typeof mortgageRate === 'number') return mortgageRate;

  return 0;
}

/**
 * Extract the current balance (the amount owed) for a Plaid account.
 *
 * IMPORTANT: `/liabilities/get` puts `balances` on the `accounts[]` entries
 * (AccountBase), NOT on the liability rows — the credit/student/mortgage
 * liability objects only carry details like APRs and payment amounts. Callers
 * must pass the matched ACCOUNT here, and the liability to the APR/minimum-
 * payment extractors below.
 *
 * Returns `null` when Plaid reports no current balance — callers should treat
 * null as "unknown" and NOT import a phantom $0 debt.
 */
export function extractCurrentBalance(
  account: AccountBase | null | undefined
): number | null {
  const current = account?.balances?.current;
  if (typeof current !== 'number') return null;
  return Math.abs(current);
}

/**
 * Resolve a human-readable institution name from a Plaid institution_id.
 * Best-effort: returns the id (or undefined) if the lookup fails, so a naming
 * miss never blocks the link flow.
 */
export async function resolveInstitutionName(
  institutionId: string | null | undefined
): Promise<string | undefined> {
  if (!institutionId) return undefined;
  try {
    const res = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Us],
    });
    return res.data.institution?.name ?? institutionId;
  } catch {
    return institutionId;
  }
}

/**
 * Extract the credit limit, if present. Like the current balance, `limit`
 * lives on the ACCOUNT's `balances` (AccountBase), not on the liability row.
 */
export function extractCreditLimit(
  account: AccountBase | null | undefined
): number | undefined {
  const limit = account?.balances?.limit;
  return typeof limit === 'number' ? limit : undefined;
}

/**
 * Extract the statement minimum payment from a Plaid liability.
 *
 * - Credit cards & student loans expose `minimum_payment_amount`.
 * - Mortgages expose `next_monthly_payment`.
 * Returns `null` when none is present; callers decide the fallback.
 */
export function extractMinimumPayment(
  liability: PlaidLiability | null | undefined
): number | null {
  if (!liability) return null;
  const minAmount = liability.minimum_payment_amount;
  if (typeof minAmount === 'number') return minAmount;
  const mortgagePayment = liability.next_monthly_payment;
  if (typeof mortgagePayment === 'number') return mortgagePayment;
  return null;
}
