/** Wire types mirroring the Next.js API (src/types + route responses). */

export const DEBT_CATEGORIES = [
  'Credit Card',
  'Student Loan',
  'Auto Loan',
  'Mortgage',
  'Personal Loan',
  'Medical Debt',
  'Other',
] as const;
export type DebtCategory = (typeof DEBT_CATEGORIES)[number];

export type PayoffMethod = 'snowball' | 'avalanche' | 'custom';

export interface Debt {
  id: string;
  userId: string;
  name: string;
  category: DebtCategory;
  balance: number;
  originalBalance: number;
  interestRate: number;
  minimumPayment: number;
  creditLimit: number;
  priorityOrder?: number | null;
  dueDate?: number | null;
  isLinked?: boolean | null;
  needsReauth?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: string;
  userId: string;
  monthlyTakeHome: number;
  essentialExpenses: number;
  extraPayment: number;
  payoffMethod?: string;
  accelerationAmount?: number | null;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  category: string;
}

export interface Subscription {
  paidTier: 'free' | 'pro';
  subscriptionStatus: string;
  proEligible: boolean;
  signupTrialActive: boolean;
  signupTrialEndsAt: string | null;
  monthlyPrice: number;
}

/** POST /api/plan/calculate request (src/lib/planCalculate.ts). */
export interface CalculateDebtInput {
  id?: string;
  name?: string;
  category?: DebtCategory;
  balance: number;
  interestRate?: number;
  minimumPayment?: number;
  priorityOrder?: number;
}

export interface CalculateInput {
  method?: PayoffMethod;
  debts: CalculateDebtInput[];
  extraPayment?: number;
  monthlyIncome?: number;
  essentialExpenses?: number;
}

export interface DebtPayoffSchedule {
  debtId: string;
  debtName: string;
  category: string;
  originalBalance: number;
  monthPaidOff: number;
  interestPaid: number;
  orderInPayoff: number;
}

export interface PayoffResult {
  months: number;
  years: number;
  totalInterestPaid: number;
  totalAmountPaid: number;
  /** ISO string. */
  debtFreeDate: string;
  payoffSchedule: DebtPayoffSchedule[];
  monthlyPayment: number;
  monthlyBalances: { month: number; date: string; totalBalance: number }[];
}

export interface CalculateResponse {
  result: PayoffResult;
  minimumsOnly: { months: number; totalInterestPaid: number; debtFreeDate: string };
  interestSaved: number;
  monthsSaved: number;
  usesEstimates: boolean;
  totalMinimums: number;
  availableForDebt: number | null;
}

export interface PaymentRecord {
  id: string;
  debtId: string;
  amount: number;
  dueYear: number;
  dueMonth: number;
  paidAt: string;
}
