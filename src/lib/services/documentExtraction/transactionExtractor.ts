/**
 * transactionExtractor — service layer capability block
 *
 * Responsibility: parse individual transaction lines from bank/credit-card
 * statement text and return a flat list of {merchant, amount, date} records.
 *
 * Does NOT detect recurring charges — that is recurringDetector's job.
 * Does NOT touch the database.
 */

export interface RawTransaction {
  merchant: string;
  amount: number;
  /** ISO date string if parseable, otherwise empty string */
  date: string;
  /** Raw line from the statement for debugging */
  rawLine: string;
}

export interface TransactionExtractResult {
  period: string;
  transactions: RawTransaction[];
}

// ── Merchant name cleaning ────────────────────────────────────────────────────

/** Strip reference codes, phone numbers, location suffixes from merchant names */
function cleanMerchant(raw: string): string {
  return raw
    .replace(/\d{3}[-.]?\d{3}[-.]?\d{4}/g, '')   // phone numbers
    .replace(/#\d+/g, '')                           // store numbers
    .replace(/\*\S+/g, '')                          // reference codes after *
    .replace(/\b[A-Z0-9]{6,}\b/g, '')              // uppercase reference IDs
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());     // Title Case
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
    if (month) {
      return `${new Date().getFullYear()}-${month}-${md[2].padStart(2, '0')}`;
    }
  }
  return '';
}

// ── Exclusion patterns ────────────────────────────────────────────────────────
// Lines that look like transactions but are actually transfers, payments, etc.

const EXCLUDE_PATTERNS = [
  /payment\s+thank\s+you/i,
  /online\s+payment/i,
  /autopay/i,
  /transfer\s+(?:to|from)/i,
  /atm\s+withdrawal/i,
  /atm\s+cash/i,
  /deposit/i,
  /direct\s+deposit/i,
  /refund/i,
  /credit\s+adjustment/i,
  /interest\s+charge/i,
  /late\s+fee/i,
  /annual\s+fee/i,
  /rewards?\s+redemption/i,
  /balance\s+transfer/i,
];

function shouldExclude(line: string): boolean {
  return EXCLUDE_PATTERNS.some((p) => p.test(line));
}

// ── Line parser ───────────────────────────────────────────────────────────────

/**
 * Pattern: date  merchant  amount
 * Handles many common statement formats.
 */
const TRANSACTION_LINE = new RegExp(
  // date (optional leading)
  '^(?:(' +
    '\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?' +   // MM/DD or MM/DD/YYYY
    '|[A-Za-z]{3,}\\s+\\d{1,2}' +              // Jan 15
  ')\\s+)?' +
  // merchant (at least 3 chars, not all digits)
  '([A-Za-z][^\\d$\\n]{2,40?})' +
  // optional trailing date
  '(?:\\s+\\d{1,2}\\/\\d{1,2})?' +
  // amount — required
  '\\s+\\$?([\\d,]+\\.\\d{2})' +
  '$',
  'i',
);

export function extractTransactions(
  text: string,
  period = '',
): TransactionExtractResult {
  const transactions: RawTransaction[] = [];

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (shouldExclude(line)) continue;

    const match = line.match(TRANSACTION_LINE);
    if (!match) continue;

    const [, rawDate, rawMerchant, rawAmount] = match;
    const amount = parseFloat(rawAmount.replace(/,/g, ''));
    if (!amount || amount <= 0) continue;

    const merchant = cleanMerchant(rawMerchant);
    if (merchant.length < 2) continue;

    transactions.push({
      merchant,
      amount,
      date: rawDate ? parseDate(rawDate) : '',
      rawLine: line,
    });
  }

  return { period, transactions };
}
