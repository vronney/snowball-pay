import type { Debt } from '@/types';

/**
 * Fallback estimates for calculator fields a visitor leaves blank.
 *
 * Funnel telemetry showed APR and minimum payment are the fields that stall
 * visitors — people know their balances but rarely their rates. Previously a
 * blank APR fell back to 0%, which produced a misleadingly optimistic payoff
 * plan (less interest than reality). These estimates keep the result honest
 * while letting a balance-only entry still produce a debt-free date.
 *
 * APR sources: national averages by debt type (credit cards per Fed G.19,
 * others per major-lender published ranges). Round numbers, revisit yearly.
 */
export const ESTIMATED_APR_BY_CATEGORY: Record<Debt['category'], number> = {
  'Credit Card': 24.99,
  'Student Loan': 6.5,
  'Auto Loan': 7.5,
  Mortgage: 6.75,
  'Personal Loan': 12.0,
  'Medical Debt': 0,
  Other: 10.0,
};

/**
 * Estimates a monthly minimum payment when the field is blank.
 * Card issuers commonly require ~2% of the balance with a floor around $25;
 * installment debts don't have "minimums" in the same sense, but 2% approximates
 * a mid-length amortization well enough for a first-look projection.
 */
export function estimateMinimumPayment(balance: number): number {
  if (balance <= 0) return 0;
  // Cent precision — Math.round to whole dollars could land below 2%.
  return Math.max(25, Math.ceil(balance * 2) / 100);
}

/** One-line disclosure shown whenever any debt in the plan uses an estimate. */
export function estimateDisclosure(category: Debt['category']): string {
  const apr = ESTIMATED_APR_BY_CATEGORY[category];
  return `For blank fields we use a ${apr}% estimated APR and the greater of $25 or 2% of the balance as the minimum payment — refine either anytime.`;
}
