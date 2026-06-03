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

function detectFrequency(text: string): IncomeFrequency {
  if (/bi[-\s]?weekly|every\s+two\s+weeks|26\s+times/i.test(text)) return 'bi-weekly';
  if (/semi[-\s]?monthly|twice\s+(?:a|per)\s+month|24\s+times/i.test(text)) return 'semi-monthly';
  if (/weekly|every\s+week|52\s+times/i.test(text)) return 'weekly';
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

  // W2 annual wages — rough monthly net (assume 22% effective rate)
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

  // Gross pay only — rough net (assume 25% withholding)
  const grossRaw = firstMatch(text, GROSS_PAY_PATTERNS);
  if (grossRaw) {
    const perPeriod = parseDollar(grossRaw);
    if (perPeriod > 0) {
      const grossMonthly = toMonthly(perPeriod, frequency);
      const monthlyTakeHome = parseFloat((grossMonthly * 0.75).toFixed(2));
      return {
        type: 'income',
        items: [{ monthlyTakeHome, source, frequency, confidence: 0.40 }],
        confident: false, // below threshold — caller should try Claude
      };
    }
  }

  // Nothing found
  return { type: 'income', items: [], confident: false };
}
