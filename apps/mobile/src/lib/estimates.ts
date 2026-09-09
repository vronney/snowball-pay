import type { DebtCategory } from './types';

/**
 * Mirror of src/lib/calculatorEstimates.ts in the web repo. The API applies
 * these when a field is blank; the client needs the same table only to
 * persist the plan the user was shown ("Save my plan").
 */
export const ESTIMATED_APR_BY_CATEGORY: Record<DebtCategory, number> = {
  'Credit Card': 24.99,
  'Student Loan': 6.5,
  'Auto Loan': 7.5,
  Mortgage: 6.75,
  'Personal Loan': 12.0,
  'Medical Debt': 0,
  Other: 10.0,
};

export function estimateMinimumPayment(balance: number): number {
  if (balance <= 0) return 0;
  return Math.max(25, Math.ceil(balance * 2) / 100);
}

export const ESTIMATE_DISCLOSURE =
  'Blank APR or minimum fields use a category-average APR and the greater of $25 or 2% of the balance — refine either anytime.';
