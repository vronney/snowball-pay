/**
 * incomeExtractor — service layer capability block
 *
 * Responsibility: extract income information from plain text using regex.
 * Handles W2s, pay stubs, and offer letters where format is structured enough.
 *
 * Returns a confidence score. The orchestration layer (the route) falls back
 * to Claude for income docs with confidence < threshold, since pay stub formats
 * are far less standardized than bank statements.
 */

export type IncomeFrequency = 'monthly' | 'bi-weekly' | 'weekly' | 'semi-monthly';
export type IncomeSource = 'W2' | '1099' | 'Self-Employed' | 'Unknown';

export interface ExtractedIncomeItem {
  monthlyTakeHome: number;
  source: IncomeSource;
  frequency: IncomeFrequency;
  /** 0–1 confidence in this extraction */
  confidence: number;
}

export interface IncomeExtractResult {
  type: 'income';
  items: ExtractedIncomeItem[];
  confident: boolean;
}

const CONFIDENCE_THRESHOLD = 0.6;

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDollar(raw: string): number {
  return parseFloat(raw.replace(/[$,]/g, '')) || 0;
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

// ── Field patterns ────────────────────────────────────────────────────────────

const NET_PAY_PATTERNS = [
  /net\s+pay[:\s]+\$?([\d,]+\.?\d*)/i,
  /take[-\s]home\s+pay[:\s]+\$?([\d,]+\.?\d*)/i,
  /net\s+(?:amount|earnings|income)[:\s]+\$?([\d,]+\.?\d*)/i,
  /total\s+net[:\s]+\$?([\d,]+\.?\d*)/i,
  /net\s+wages[:\s]+\$?([\d,]+\.?\d*)/i,
  /direct\s+deposit\s+amount[:\s]+\$?([\d,]+\.?\d*)/i,
];

const GROSS_PAY_PATTERNS = [
  /gross\s+pay[:\s]+\$?([\d,]+\.?\d*)/i,
  /gross\s+(?:earnings|wages|income)[:\s]+\$?([\d,]+\.?\d*)/i,
  /total\s+gross[:\s]+\$?([\d,]+\.?\d*)/i,
  /current\s+gross[:\s]+\$?([\d,]+\.?\d*)/i,
];

// W2 box 1 — wages, tips, other compensation
const W2_WAGES_PATTERNS = [
  /box\s+1[:\s]+\$?([\d,]+\.?\d*)/i,
  /wages,?\s+tips[^:]*[:\s]+\$?([\d,]+\.?\d*)/i,
];

// Salary offer letter
const SALARY_PATTERNS = [
  /annual\s+(?:base\s+)?salary[:\s]+\$?([\d,]+\.?\d*)/i,
  /base\s+(?:annual\s+)?compensation[:\s]+\$?([\d,]+\.?\d*)/i,
];

// ── Frequency detection ───────────────────────────────────────────────────────

/**
 * Parse a date from MM/DD/YYYY or MM-DD-YYYY into a UTC timestamp.
 * Using UTC avoids DST off-by-one errors when diffing dates.
 * Returns null if any component is outside a plausible range.
 */
function parseMDY(m: string, d: string, y: string): number | null {
  const month = parseInt(m, 10);
  const day   = parseInt(d, 10);
  const year  = parseInt(y, 10);
  if (month < 1 || month > 12)    return null;
  if (day   < 1 || day   > 31)    return null;
  if (year  < 2000 || year > 2100) return null;
  return Date.UTC(year, month - 1, day);
}

/** Return the inclusive number of days between two UTC timestamps. */
function daysBetween(a: number, b: number): number {
  return Math.floor(Math.abs(b - a) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Map an inclusive day count to a pay frequency.
 * Ranges are non-overlapping:
 *   weekly      6–8
 *   bi-weekly   13–14
 *   semi-monthly 15–17
 *   monthly     28–32
 * Returns null for ambiguous counts so callers can fall back to keyword matching.
 */
export function daysToFrequency(days: number): IncomeFrequency | null {
  if (days >= 6  && days <= 8)  return 'weekly';
  if (days >= 13 && days <= 14) return 'bi-weekly';
  if (days >= 15 && days <= 17) return 'semi-monthly';
  if (days >= 28 && days <= 32) return 'monthly';
  return null;
}

/**
 * Infer pay frequency from a pay-period date range embedded in the text.
 * Returns null if no date range is found or the count is ambiguous.
 *
 * Checked before keyword matching so explicit date evidence takes precedence
 * over incidental occurrences of words like "weekly pay rate".
 */
export function detectFrequencyFromDateRange(text: string): IncomeFrequency | null {
  const SEP  = '[\\-/]';
  const DATE = `(\\d{1,2})${SEP}(\\d{1,2})${SEP}(\\d{4})`;

  // Strategy 1: inline range — "04/07/2026 - 04/13/2026" or "04-07-2026 to 04-13-2026"
  const inlineRange = text.match(new RegExp(`${DATE}\\s*(?:-|–|\\bto\\b)\\s*${DATE}`, 'i'));
  if (inlineRange) {
    const start = parseMDY(inlineRange[1], inlineRange[2], inlineRange[3]);
    const end   = parseMDY(inlineRange[4], inlineRange[5], inlineRange[6]);
    if (start !== null && end !== null) return daysToFrequency(daysBetween(start, end));
  }

  // Strategy 2: separate labeled fields — "Pay Begin Date: 05-25-2026 … Pay End Date: 05-31-2026"
  const beginMatch = text.match(
    /pay\s+(?:begin|start|period\s+start|from)\s+date[:\s]+(\d{1,2})[-/](\d{1,2})[-/](\d{4})/i,
  );
  const endMatch = text.match(
    /pay\s+(?:end|period\s+end|through|thru)\s+date[:\s]+(\d{1,2})[-/](\d{1,2})[-/](\d{4})/i,
  );
  if (beginMatch && endMatch) {
    const start = parseMDY(beginMatch[1], beginMatch[2], beginMatch[3]);
    const end   = parseMDY(endMatch[1],   endMatch[2],   endMatch[3]);
    if (start !== null && end !== null) return daysToFrequency(daysBetween(start, end));
  }

  return null;
}

function detectFrequency(text: string): IncomeFrequency {
  // Explicit multi-word keywords are high-confidence — check them first.
  // Bi-weekly must precede weekly since "bi-weekly" contains "weekly".
  if (/bi[-\s]?weekly|every\s+two\s+weeks|26\s+(?:times|pays|checks|periods)/i.test(text)) return 'bi-weekly';
  if (/semi[-\s]?monthly|twice\s+(?:a|per)\s+month|24\s+(?:times|pays|checks|periods)/i.test(text)) return 'semi-monthly';

  // Date-range inference runs before the generic "weekly" keyword so that
  // explicit pay-period dates (e.g., a 14-day range) beat incidental text
  // like "weekly pay rate" on a bi-weekly stub.
  const fromRange = detectFrequencyFromDateRange(text);
  if (fromRange) return fromRange;

  // Keyword fallback — only reached when no date range is present.
  if (
    /\bweekly\b|\bwkly\b|every\s+week|once\s+(?:a|per)\s+week|per\s+week|52\s+(?:times|pays|checks|periods)|7[-\s]day\s+pay|pay\s+(?:cycle|period|frequency)[:\s]+week/i.test(text)
  ) return 'weekly';

  return 'monthly';
}

function detectSource(text: string): IncomeSource {
  if (/\bw[-\s]?2\b/i.test(text)) return 'W2';
  if (/\b1099\b/i.test(text)) return '1099';
  if (/self[-\s]?employ|freelance|contractor|schedule\s+[cse]/i.test(text)) return 'Self-Employed';
  return 'Unknown';
}

// ── Monthly normalization ─────────────────────────────────────────────────────

function toMonthly(amount: number, frequency: IncomeFrequency): number {
  switch (frequency) {
    case 'weekly':       return amount * 4.33;
    case 'bi-weekly':    return amount * 2.167;
    case 'semi-monthly': return amount * 2;
    default:             return amount;
  }
}

// ── Main extractor ────────────────────────────────────────────────────────────

export function extractIncome(text: string): IncomeExtractResult {
  const frequency = detectFrequency(text);
  const source = detectSource(text);

  // Try net pay first (most reliable for take-home)
  const netRaw = firstMatch(text, NET_PAY_PATTERNS);
  if (netRaw) {
    const perPeriod = parseDollar(netRaw);
    if (perPeriod > 0) {
      const monthlyTakeHome = parseFloat(toMonthly(perPeriod, frequency).toFixed(2));
      return {
        type: 'income',
        items: [{ monthlyTakeHome, source, frequency, confidence: 0.85 }],
        confident: true,
      };
    }
  }

  // Salary offer letter: annual / 12, assume 20% tax if gross only
  const salaryRaw = firstMatch(text, SALARY_PATTERNS);
  if (salaryRaw) {
    const annual = parseDollar(salaryRaw);
    if (annual > 0) {
      const monthlyTakeHome = parseFloat(((annual / 12) * 0.8).toFixed(2));
      return {
        type: 'income',
        items: [{ monthlyTakeHome, source, frequency: 'monthly', confidence: 0.65 }],
        confident: true,
      };
    }
  }

  // W2 annual wages -- rough monthly net (assume 22% effective rate)
  const w2Raw = firstMatch(text, W2_WAGES_PATTERNS);
  if (w2Raw) {
    const annual = parseDollar(w2Raw);
    if (annual > 0) {
      const monthlyTakeHome = parseFloat(((annual / 12) * 0.78).toFixed(2));
      return {
        type: 'income',
        items: [{ monthlyTakeHome, source: 'W2', frequency: 'monthly', confidence: 0.60 }],
        confident: 0.60 >= CONFIDENCE_THRESHOLD,
      };
    }
  }

  const grossRaw = firstMatch(text, GROSS_PAY_PATTERNS);
  if (grossRaw) {
    const perPeriod = parseDollar(grossRaw);
    if (perPeriod > 0) {
      const grossMonthly = toMonthly(perPeriod, frequency);
      const monthlyTakeHome = parseFloat((grossMonthly * 0.75).toFixed(2));
      return {
        type: 'income',
        items: [{ monthlyTakeHome, source, frequency, confidence: 0.40 }],
        confident: false,
      };
    }
  }

  return { type: 'income', items: [], confident: false };
}
