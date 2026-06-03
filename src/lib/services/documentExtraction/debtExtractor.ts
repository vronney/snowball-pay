/**
 * debtExtractor -- service layer capability block
 *
 * Extracts structured debt fields from a flat text string produced by pdfParser.
 * The PDF extractor collapses all content into a single string (no real newlines
 * between sections), so patterns must work on substrings, not line anchors.
 */

export type DebtCategory =
  | 'Credit Card'
  | 'Student Loan'
  | 'Auto Loan'
  | 'Mortgage'
  | 'Personal Loan'
  | 'Medical Debt'
  | 'Other';

export interface ExtractedDebtItem {
  name: string;
  category: DebtCategory;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  creditLimit: number;
  dueDate: number | null;
  /** 0-1 overall confidence based on how many key fields were found */
  confidence: number;
}

export interface DebtExtractResult {
  type: 'debt';
  items: ExtractedDebtItem[];
  confident: boolean;
}

const CONFIDENCE_THRESHOLD = 0.5;

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDollar(raw: string): number {
  return parseFloat(raw.replace(/[$,]/g, '')) || 0;
}

function parsePercent(raw: string): number {
  return parseFloat(raw.replace(/%/g, '')) || 0;
}

/**
 * Try each pattern against text and return the first capture group of the
 * first match. Patterns must NOT use ^ or $ anchors or [^\n] spans since the
 * PDF text is a flat single-line string.
 */
function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

// ── Field patterns ─────────────────────────────────────────────────────────────
//
// Rules (from pay-stub debugging):
// - Use [:\s]+ not [:\s] — multiple spaces/colons appear in flat text
// - Avoid [^\n] spans — no real newlines; these over-match in a flat string
// - Prefer tighter right-side terminators like \b or lookahead where possible
// - For APR: match "purchase APR" before generic "APR" to avoid cash-advance rate

const BALANCE_PATTERNS = [
  /new\s+balance[:\s]+\$?([\d,]+\.?\d*)/i,
  /(?:current|statement|closing|outstanding|principal)\s+balance[:\s]+\$?([\d,]+\.?\d*)/i,
  /amount\s+owed[:\s]+\$?([\d,]+\.?\d*)/i,
  /payoff\s+amount[:\s]+\$?([\d,]+\.?\d*)/i,
  // Fallback: bare "Balance:" — least specific, try last
  /\bbalance[:\s]+\$?([\d,]+\.?\d*)/i,
];

const RATE_PATTERNS = [
  // Prefer purchase APR over cash-advance/penalty APR
  /purchase\s+apr[:\s]+([\d.]+)\s*%/i,
  /(?:standard|regular|variable)\s+apr[:\s]+([\d.]+)\s*%/i,
  /annual\s+percentage\s+rate[:\s]+([\d.]+)\s*%/i,
  /interest\s+rate[:\s]+([\d.]+)\s*%/i,
  /\bapr[:\s]+([\d.]+)\s*%/i,
];

const MINIMUM_PATTERNS = [
  /minimum\s+payment\s+due[:\s]+\$?([\d,]+\.?\d*)/i,
  /minimum\s+due[:\s]+\$?([\d,]+\.?\d*)/i,
  /min(?:imum)?\s+payment[:\s]+\$?([\d,]+\.?\d*)/i,
  // "Amount Due" is a weaker signal — some statements use it for the full balance
  /amount\s+due[:\s]+\$?([\d,]+\.?\d*)/i,
];

const CREDIT_LIMIT_PATTERNS = [
  /credit\s+limit[:\s]+\$?([\d,]+\.?\d*)/i,
  /total\s+credit\s+(?:limit|line)[:\s]+\$?([\d,]+\.?\d*)/i,
  /credit\s+line[:\s]+\$?([\d,]+\.?\d*)/i,
];

const DUE_DATE_PATTERNS = [
  // Prefer labeled "Payment Due Date: MM/DD" — avoids grabbing random day numbers
  /payment\s+due\s+date[:\s]+(?:\w+\s+)?(\d{1,2})(?:\/\d{1,2})?/i,
  /due\s+date[:\s]+(?:\w+\s+)?(\d{1,2})(?:\/\d{1,2})?/i,
  // Date with full date: extract day component only
  /due[:\s]+\d{1,2}\/(\d{1,2})(?:\/\d{2,4})?/i,
];

// Account name: avoid [^\n]+ spans; match up to a common terminator
const ACCOUNT_NAME_PATTERNS = [
  /account\s+(?:name|nickname)[:\s]+([A-Za-z0-9 ]{3,40}?)(?=\s{2,}|\s*[A-Z]{2,}|\s*\d{5}|$)/i,
  /(?:card\s+)?account\s+ending\s+in\s+\d+[:\s]+([A-Za-z0-9 ]{3,40}?)(?=\s{2,}|\s*[A-Z]{2,}|$)/i,
];

// ── Category detection ────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: [DebtCategory, RegExp][] = [
  ['Credit Card',   /credit\s+card|visa|mastercard|amex|american\s+express|discover/i],
  ['Student Loan',  /student\s+loan|sallie\s+mae|navient|great\s+lakes|fed(?:eral)?\s+loan/i],
  ['Auto Loan',     /auto\s+loan|car\s+loan|vehicle\s+loan|auto\s+finance/i],
  ['Mortgage',      /mortgage|home\s+loan|deed\s+of\s+trust|escrow/i],
  ['Medical Debt',  /medical|hospital|clinic|health\s+care|physician/i],
  ['Personal Loan', /personal\s+loan|unsecured\s+loan|installment\s+loan/i],
];

function detectCategory(text: string): DebtCategory {
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(text)) return category;
  }
  return 'Other';
}

// ── Main extractor ────────────────────────────────────────────────────────────

export function extractDebt(text: string, fileName = ''): DebtExtractResult {
  const balanceRaw  = firstMatch(text, BALANCE_PATTERNS);
  const rateRaw     = firstMatch(text, RATE_PATTERNS);
  const minimumRaw  = firstMatch(text, MINIMUM_PATTERNS);
  const limitRaw    = firstMatch(text, CREDIT_LIMIT_PATTERNS);
  const dueDateRaw  = firstMatch(text, DUE_DATE_PATTERNS);
  const nameRaw     = firstMatch(text, ACCOUNT_NAME_PATTERNS);

  const balance       = balanceRaw  ? parseDollar(balanceRaw)  : 0;
  const interestRate  = rateRaw     ? parsePercent(rateRaw)    : 0;
  const minimumPayment = minimumRaw ? parseDollar(minimumRaw)  : 0;
  const creditLimit   = limitRaw    ? parseDollar(limitRaw)    : 0;
  const dueDate       = dueDateRaw  ? parseInt(dueDateRaw, 10) : null;
  const name          = nameRaw?.trim() || fileName.replace(/\.[^.]+$/, '') || 'Unknown Account';
  const category      = detectCategory(text);

  // Confidence: balance is required; rate and minimum improve it
  const fieldsFound = [balance > 0, interestRate > 0, minimumPayment > 0].filter(Boolean).length;
  const confidence  = fieldsFound / 3;

  return {
    type:      'debt',
    items:     balance > 0 ? [{ name, category, balance, interestRate, minimumPayment, creditLimit, dueDate, confidence }] : [],
    confident: confidence >= CONFIDENCE_THRESHOLD,
  };
}
