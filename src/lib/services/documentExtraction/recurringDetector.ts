/**
 * recurringDetector — service layer capability block
 *
 * Responsibility: given raw transactions from multiple statement periods,
 * identify genuinely recurring charges algorithmically using fuzzy merchant
 * name matching and cross-period frequency analysis.
 *
 * Rules (mirrors the old Opus reconciliation prompt, but deterministic):
 * - Recurring = appears in 2+ distinct periods at similar amounts (±15%)
 * - OR is an obvious fixed-bill keyword seen even once (rent, known subscription)
 * - Excludes debt minimum payments (tracked separately in the app)
 * - Normalizes all amounts to monthly equivalents
 */

import { distance } from 'fastest-levenshtein';
import type { RawTransaction, TransactionExtractResult } from './transactionExtractor';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'housing'
  | 'utilities'
  | 'insurance'
  | 'food'
  | 'transport'
  | 'medical'
  | 'subscriptions'
  | 'entertainment'
  | 'other';

export type RecurringFrequency = 'monthly' | 'bi-weekly' | 'weekly' | 'annual';

export interface RecurringCharge {
  name: string;
  amount: number;
  frequency: RecurringFrequency;
  monthlyAmount: number;
  category: ExpenseCategory;
  isEssential: boolean;
  occurrences: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface RecurringDetectResult {
  type: 'statement';
  recurringCharges: RecurringCharge[];
  totalMonthlyEssential: number;
  totalMonthlyAll: number;
  analysisNotes: string;
}

// ── Category / essential classification ──────────────────────────────────────

const CATEGORY_KEYWORDS: [ExpenseCategory, boolean, RegExp][] = [
  // [category, isEssential, pattern]
  ['housing',       true,  /rent|mortgage|hoa|property\s+tax|storage/i],
  ['utilities',     true,  /electric|gas\s+bill|water\s+bill|internet|comcast|xfinity|at&t|verizon|t-mobile|spectrum|cox\s+comm/i],
  ['insurance',     true,  /insurance|geico|allstate|state\s+farm|progressive|aetna|cigna|blue\s+cross|humana/i],
  ['food',          true,  /grocery|groceries|whole\s+foods|kroger|safeway|trader\s+joe|aldi|costco|sam.s\s+club|walmart(?!\s+com)/i],
  ['transport',     true,  /shell|exxon|chevron|bp\s+|sunoco|fuel|gasoline|metro|transit|uber|lyft|toll/i],
  ['medical',       true,  /pharmacy|walgreens|cvs|rite\s+aid|doctor|dental|vision|clinic|hospital/i],
  ['subscriptions', false, /netflix|hulu|disney|hbo|max|spotify|apple\s+music|amazon\s+prime|youtube|paramount|peacock|siriusxm|audible|duolingo/i],
  ['entertainment', false, /gym|fitness|planet\s+fitness|24\s+hour|equinox|gaming|xbox|playstation|steam|adobe|microsoft\s+365|dropbox|google\s+one/i],
];

function classifyMerchant(name: string): { category: ExpenseCategory; isEssential: boolean } {
  for (const [category, isEssential, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(name)) return { category, isEssential };
  }
  return { category: 'other', isEssential: false };
}

// ── Fuzzy merchant grouping ───────────────────────────────────────────────────

/** Normalize for comparison: lowercase, strip punctuation, collapse spaces */
function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/** Two merchant names are "the same" if edit distance is small relative to length */
function isSameMerchant(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return true;
  const threshold = maxLen <= 6 ? 1 : maxLen <= 12 ? 2 : 3;
  return distance(na, nb) <= threshold;
}

/** Group transactions by fuzzy merchant name, return map of canonical name → transactions */
function groupByMerchant(
  transactions: RawTransaction[],
): Map<string, RawTransaction[]> {
  const groups = new Map<string, RawTransaction[]>();

  for (const tx of transactions) {
    let matched = false;
    for (const [canonical, group] of groups) {
      if (isSameMerchant(canonical, tx.merchant)) {
        group.push(tx);
        matched = true;
        break;
      }
    }
    if (!matched) {
      groups.set(tx.merchant, [tx]);
    }
  }

  return groups;
}

// ── Amount similarity ─────────────────────────────────────────────────────────

function medianAmount(amounts: number[]): number {
  const sorted = [...amounts].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** All amounts within ±15% of the median */
function amountsConsistent(amounts: number[]): boolean {
  const med = medianAmount(amounts);
  return amounts.every((a) => Math.abs(a - med) / med <= 0.15);
}

// ── Frequency detection ───────────────────────────────────────────────────────

/** Heuristic: if we see 4+ occurrences in 1-2 periods, likely weekly/bi-weekly */
function estimateFrequency(
  txs: RawTransaction[],
  periodCount: number,
): RecurringFrequency {
  const perPeriod = txs.length / Math.max(periodCount, 1);
  if (perPeriod >= 3.5) return 'weekly';
  if (perPeriod >= 1.8) return 'bi-weekly';
  return 'monthly';
}

function toMonthly(amount: number, frequency: RecurringFrequency): number {
  switch (frequency) {
    case 'weekly':    return amount * 4.33;
    case 'bi-weekly': return amount * 2.167;
    case 'annual':    return amount / 12;
    default:          return amount;
  }
}

// ── Well-known fixed-bill keywords (recurring even with 1 occurrence) ─────────

const FIXED_BILL_PATTERN = /rent|mortgage|electric|gas\s+bill|water\s+bill|internet|insurance/i;

// ── Main detector ─────────────────────────────────────────────────────────────

/**
 * Detect recurring charges from multiple statement extraction results.
 *
 * @param extractions  Array of per-period extraction results
 */
export function detectRecurring(
  extractions: TransactionExtractResult[],
): RecurringDetectResult {
  const periodCount = extractions.length;
  const allTransactions = extractions.flatMap((e) => e.transactions);

  if (allTransactions.length === 0) {
    return {
      type: 'statement',
      recurringCharges: [],
      totalMonthlyEssential: 0,
      totalMonthlyAll: 0,
      analysisNotes: 'No transactions found in provided statements.',
    };
  }

  const groups = groupByMerchant(allTransactions);
  const charges: RecurringCharge[] = [];

  for (const [canonical, txs] of groups) {
    const occurrences = txs.length;
    const amounts = txs.map((t) => t.amount);
    const consistent = amountsConsistent(amounts);
    const isFixedBill = FIXED_BILL_PATTERN.test(canonical);

    // Recurring criteria
    const appearsInMultiplePeriods = occurrences >= 2;
    if (!appearsInMultiplePeriods && !isFixedBill) continue;
    if (!consistent) continue;

    const frequency = estimateFrequency(txs, periodCount);
    const amount = medianAmount(amounts);
    const monthlyAmount = parseFloat(toMonthly(amount, frequency).toFixed(2));
    const { category, isEssential } = classifyMerchant(canonical);

    const confidence: 'high' | 'medium' | 'low' =
      occurrences >= 3 && consistent ? 'high' :
      occurrences >= 2 && consistent ? 'medium' :
      'low';

    charges.push({
      name: canonical,
      amount,
      frequency,
      monthlyAmount,
      category,
      isEssential,
      occurrences,
      confidence,
    });
  }

  // Sort by monthly amount descending
  charges.sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const totalMonthlyEssential = charges
    .filter((c) => c.isEssential)
    .reduce((s, c) => s + c.monthlyAmount, 0);
  const totalMonthlyAll = charges.reduce((s, c) => s + c.monthlyAmount, 0);

  const dateRange = extractions.map((e) => e.period).filter(Boolean).join(', ');
  const analysisNotes =
    `${periodCount} statement(s) analysed${dateRange ? ` (${dateRange})` : ''}. ` +
    `${allTransactions.length} transactions found. ` +
    `${charges.length} recurring charge(s) identified.`;

  return {
    type: 'statement',
    recurringCharges: charges,
    totalMonthlyEssential: parseFloat(totalMonthlyEssential.toFixed(2)),
    totalMonthlyAll: parseFloat(totalMonthlyAll.toFixed(2)),
    analysisNotes,
  };
}
