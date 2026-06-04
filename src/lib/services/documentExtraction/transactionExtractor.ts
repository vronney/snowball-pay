/**
 * transactionExtractor -- service layer capability block
 *
 * Parses transactions from bank/credit-card statement text.
 *
 * Key insight from pay-stub debugging: the PDF extractor produces a flat
 * single-line string, not newline-separated rows. The old approach of
 * splitting on '\n' and matching ^..$ per line produces zero results.
 *
 * Strategy: scan the flat text for date-amount pairs using a token scanner
 * rather than line-anchored regex. The text between a date token and the
 * next amount token is treated as the merchant name.
 */

export interface RawTransaction {
  merchant: string;
  amount: number;
  date: string;
  rawLine: string;
}

export interface TransactionExtractResult {
  period: string;
  transactions: RawTransaction[];
}

// ── Date detection ────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseDate(raw: string): string {
  // MM/DD/YYYY or MM/DD/YY
  const mdy = raw.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (mdy) {
    const [, m, d, y] = mdy;
    const year = y ? (y.length === 2 ? `20${y}` : y) : new Date().getFullYear().toString();
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Jan 15 or January 15
  const md = raw.match(/([A-Za-z]{3,})\s+(\d{1,2})/);
  if (md) {
    const monthKey = md[1].toLowerCase().slice(0, 3);
    const month = MONTH_MAP[monthKey];
    if (month) return `${new Date().getFullYear()}-${month}-${md[2].padStart(2, '0')}`;
  }
  return '';
}

// ── Merchant name cleaning ────────────────────────────────────────────────────

function cleanMerchant(raw: string): string {
  return raw
    .replace(/\d{3}[-.]?\d{3}[-.]?\d{4}/g, '')  // phone numbers
    .replace(/#\d+/g, '')                          // store numbers
    .replace(/\*\S+/g, '')                         // reference codes after *
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Exclusion patterns ────────────────────────────────────────────────────────

const EXCLUDE_PATTERNS = [
  /payment\s+thank\s+you/i, /online\s+payment/i, /autopay/i,
  /transfer\s+(?:to|from)/i, /atm/i, /deposit/i, /direct\s+deposit/i,
  /refund/i, /credit\s+adjustment/i, /interest\s+charge/i,
  /late\s+fee/i, /annual\s+fee/i, /balance\s+transfer/i,
];

function shouldExclude(s: string): boolean {
  return EXCLUDE_PATTERNS.some((p) => p.test(s));
}

// ── Token scanner ─────────────────────────────────────────────────────────────
//
// Works on flat text by finding all date tokens and all dollar amounts,
// then pairs each date with the nearest following amount, treating the
// text between them as the merchant name.

const DATE_TOKEN   = /(?:\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2})/gi;
const AMOUNT_TOKEN = /\$?([\d,]+\.\d{2})/g;
const MAX_MERCHANT_SPAN = 80; // max chars between date and amount to be considered a transaction

interface Token { index: number; end: number; value: string; }

function findTokens(text: string, re: RegExp): Token[] {
  const tokens: Token[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tokens.push({ index: m.index, end: m.index + m[0].length, value: m[1] ?? m[0] });
  }
  return tokens;
}

export function extractTransactions(
  text: string,
  period = '',
): TransactionExtractResult {
  const transactions: RawTransaction[] = [];
  const seen = new Set<string>(); // deduplicate by (merchant, amount, date)

  // Flatten any remaining whitespace for consistent scanning
  const flat = text.replace(/\s+/g, ' ');

  const dates   = findTokens(flat, DATE_TOKEN);
  const amounts = findTokens(flat, AMOUNT_TOKEN);

  for (const dateToken of dates) {
    // Find the first amount that comes after this date within MAX_MERCHANT_SPAN chars
    const candidate = amounts.find(
      (a) => a.index > dateToken.end && a.index - dateToken.end <= MAX_MERCHANT_SPAN,
    );
    if (!candidate) continue;

    const between = flat.slice(dateToken.end, candidate.index).trim();
    if (shouldExclude(between) || shouldExclude(dateToken.value)) continue;

    const merchant = cleanMerchant(between);
    if (merchant.length < 2) continue;

    const amount = parseFloat(candidate.value.replace(/,/g, ''));
    if (!amount || amount <= 0 || amount > 50_000) continue; // sanity cap

    const date = parseDate(dateToken.value);
    const key  = `${merchant}|${amount}|${date}`;
    if (seen.has(key)) continue;
    seen.add(key);

    transactions.push({
      merchant,
      amount,
      date,
      rawLine: flat.slice(dateToken.index, candidate.end),
    });
  }

  return { period, transactions };
}

// Export cleanMerchant and parseDate for use in other modules
export { cleanMerchant, parseDate } from './dataCleanup';
