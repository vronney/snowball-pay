/**
 * debtExtractor — service layer capability block
 *
 * Responsibility: extract structured debt fields from plain text using regex
 * patterns covering major US bank/credit-card statement formats.
 *
 * Returns per-field confidence scores so the orchestration layer can decide
 * whether to present the result to the user or escalate to an AI fallback.
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
  /** 0–1 overall confidence based on how many key fields were found */
  confidence: number;
}

export interface DebtExtractResult {
  type: 'debt';
  items: ExtractedDebtItem[];
  /** True if at least one item has confidence >= CONFIDENCE_THRESHOLD */
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

/** Try a list of patterns against text, return first match group 1 or null */
function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

// ── Field patterns ────────────────────────────────────────────────────────────

const BALANCE_PATTERNS = [
  /(?:current\s+)?(?:new\s+)?balance[:\s]+\$?([\d,]+\.?\d*)/i,
  /(?:statement|closing)\s+balance[:\s]+\$?([\d,]+\.?\d*)/i,
  /amount\s+owed[:\s]+\$?([\d,]+\.?\d*)/i,
  /outstanding\s+balance[:\s]+\$?([\d,]+\.?\d*)/i,
  /principal\s+balance[:\s]+\$?([\d,]+\.?\d*)/i,
  /payoff\s+amount[:\s]+\$?([\d,]+\.?\d*)/i,
];

const RATE_PATTERNS = [
  /(?:purchase\s+)?apr[:\s]+([\d.]+)\s*%/i,
  /interest\s+rate[:\s]+([\d.]+)\s*%/i,
  /annual\s+percentage\s+rate[:\s]+([\d.]+)\s*%/i,
  /variable\s+apr[:\s]+([\d.]+)\s*%/i,
];

const MINIMUM_PATTERNS = [
  /minimum\s+(?:payment\s+)?due[:\s]+\$?([\d,]+\.?\d*)/i,
  /min(?:imum)?\s+payment[:\s]+\$?([\d,]+\.?\d*)/i,
  /payment\s+due[:\s]+\$?([\d,]+\.?\d*)/i,
  /amount\s+due[:\s]+\$?([\d,]+\.?\d*)/i,
];

const CREDIT_LIMIT_PATTERNS = [
  /credit\s+limit[:\s]+\$?([\d,]+\.?\d*)/i,
  /total\s+credit\s+line[:\s]+\$?([\d,]+\.?\d*)/i,
  /credit\s+line[:\s]+\$?([\d,]+\.?\d*)/i,
];

const DUE_DATE_PATTERNS = [
  /payment\s+due\s+(?:date)?[:\s]+\w+\s+(\d{1,2})/i,
  /due\s+(?:date|on)[:\s]+\w+\s+(\d{1,2})/i,
  /due\s+(?:date|on)[:\s]+(\d{1,2})\/\d{1,2}/i,
];

const ACCOUNT_NAME_PATTERNS = [
  /account\s+(?:name|nickname)[:\s]+([^\n]+)/i,
  /(?:card\s+)?account\s+ending\s+in\s+\d+[:\s]+([^\n]+)/i,
  /(?:your\s+)?([a-z\s]+(?:card|loan|mortgage|credit))[:\s]/i,
];

// ── Category detection ────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: [DebtCategory, RegExp][] = [
  ['Credit Card', /credit\s+card|visa|mastercard|amex|american\s+express|discover/i],
  ['Student Loan', /student\s+loan|sallie\s+mae|navient|great\s+lakes|fed(?:eral)?\s+loan/i],
  ['Auto Loan', /auto\s+loan|car\s+loan|vehicle\s+loan|auto\s+finance/i],
  ['Mortgage', /mortgage|home\s+loan|deed\s+of\s+trust|escrow/i],
  ['Medical Debt', /medical|hospital|clinic|health\s+care|physician/i],
  ['Personal Loan', /personal\s+loan|unsecured\s+loan|installment\s+loan/i],
];

function detectCategory(text: string): DebtCategory {
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(text)) return category;
  }
  return 'Other';
}

// ── Main extractor ────────────────────────────────────────────────────────────

/**
 * Extract debt fields from plain statement text.
 * Designed for single-account statements; for multi-account text pass each
 * account's section separately.
 */
export function extractDebt(text: string, fileName = ''): DebtExtractResult {
  const balanceRaw = firstMatch(text, BALANCE_PATTERNS);
  const rateRaw = firstMatch(text, RATE_PATTERNS);
  const minimumRaw = firstMatch(text, MINIMUM_PATTERNS);
  const limitRaw = firstMatch(text, CREDIT_LIMIT_PATTERNS);
  const dueDateRaw = firstMatch(text, DUE_DATE_PATTERNS);
  const nameRaw = firstMatch(text, ACCOUNT_NAME_PATTERNS);

  const balance = balanceRaw ? parseDollar(balanceRaw) : 0;
  const interestRate = rateRaw ? parsePercent(rateRaw) : 0;
  const minimumPayment = minimumRaw ? parseDollar(minimumRaw) : 0;
  const creditLimit = limitRaw ? parseDollar(limitRaw) : 0;
  const dueDate = dueDateRaw ? parseInt(dueDateRaw, 10) : null;
  const name = nameRaw?.trim() || fileName.replace(/\.[^.]+$/, '') || 'Unknown Account';
  const category = detectCategory(text);

  // Confidence: weighted by which key fields were found
  const fieldsFound = [balance > 0, interestRate > 0, minimumPayment > 0].filter(Boolean).length;
  const confidence = fieldsFound / 3;

  const item: ExtractedDebtItem = {
    name,
    category,
    balance,
    interestRate,
    minimumPayment,
    creditLimit,
    dueDate,
    confidence,
  };

  return {
    type: 'debt',
    items: balance > 0 ? [item] : [],
    confident: confidence >= CONFIDENCE_THRESHOLD,
  };
}
