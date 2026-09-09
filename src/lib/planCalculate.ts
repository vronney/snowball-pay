import { z } from 'zod';
import type { Debt } from '@/types';
import {
  calculateDebtAvalanche,
  calculateDebtCustom,
  calculateDebtSnowball,
} from '@/lib/snowball';
import {
  ESTIMATED_APR_BY_CATEGORY,
  estimateMinimumPayment,
} from '@/lib/calculatorEstimates';

/**
 * Request schema + pure runner behind POST /api/plan/calculate. Lives outside
 * the route file because Next only allows HTTP-method exports from route.ts,
 * and the mobile client mirrors this contract.
 *
 * Blank APR / minimum fields use the same category estimates as the web
 * calculator so a balance-only entry still yields an honest payoff date.
 */

const CATEGORIES = [
  'Credit Card',
  'Student Loan',
  'Auto Loan',
  'Mortgage',
  'Personal Loan',
  'Medical Debt',
  'Other',
] as const;

const money = z.number().finite().min(0).max(1_000_000_000);

const DebtInput = z.object({
  id: z.string().max(64).optional(),
  name: z.string().max(120).optional(),
  category: z.enum(CATEGORIES).default('Other'),
  balance: money.gt(0, 'Balance must be greater than 0'),
  interestRate: z.number().finite().min(0).max(100).optional(),
  minimumPayment: money.optional(),
  priorityOrder: z.number().int().min(1).optional(),
});

export const CalculateSchema = z.object({
  method: z.enum(['snowball', 'avalanche', 'custom']).default('snowball'),
  debts: z.array(DebtInput).min(1, 'Add at least one debt').max(30),
  /** Monthly acceleration beyond minimums — same meaning as the web
   *  calculator's "extra payment" field. */
  extraPayment: money.default(0),
  /** Optional budget context. When omitted the plan is minimums + extra,
   *  which is all the mobile calculator asks for. */
  monthlyIncome: money.optional(),
  essentialExpenses: money.default(0),
});

export type CalculateInput = z.infer<typeof CalculateSchema>;

function toDebt(input: z.infer<typeof DebtInput>, index: number): { debt: Debt; estimated: boolean } {
  const rateBlank = input.interestRate === undefined;
  const minimumBlank = input.minimumPayment === undefined;
  const now = new Date();
  return {
    estimated: rateBlank || minimumBlank,
    debt: {
      id: input.id ?? `debt-${index + 1}`,
      userId: '',
      name: input.name?.trim() || `Debt ${index + 1}`,
      category: input.category,
      balance: input.balance,
      originalBalance: input.balance,
      interestRate: rateBlank ? ESTIMATED_APR_BY_CATEGORY[input.category] : input.interestRate!,
      minimumPayment: minimumBlank ? estimateMinimumPayment(input.balance) : input.minimumPayment!,
      creditLimit: 0,
      priorityOrder: input.priorityOrder ?? null,
      createdAt: now,
      updatedAt: now,
    },
  };
}

export function runCalculation(input: CalculateInput) {
  const converted = input.debts.map(toDebt);
  const debts = converted.map((c) => c.debt);
  const usesEstimates = converted.some((c) => c.estimated);

  const calculate =
    input.method === 'avalanche'
      ? calculateDebtAvalanche
      : input.method === 'custom'
        ? calculateDebtCustom
        : calculateDebtSnowball;

  const totalMinimums = debts.reduce((sum, d) => sum + d.minimumPayment, 0);

  // The engine adds `extraPayment` to the natural surplus (income − essentials
  // − minimums). The web calculator wants "extra" to MEAN the acceleration, so
  // it passes extra − surplus; mirror that. Without budget context, synthesize
  // an income that leaves exactly `extra` on top of minimums.
  const monthlyIncome = input.monthlyIncome ?? totalMinimums + input.extraPayment;
  const essentialExpenses = input.monthlyIncome === undefined ? 0 : input.essentialExpenses;
  const naturalSurplus = monthlyIncome - essentialExpenses - totalMinimums;

  const result = calculate(
    debts,
    monthlyIncome,
    essentialExpenses,
    0,
    input.extraPayment - naturalSurplus,
  );

  // Same baseline the web calculator shows: minimums only, no snowball.
  const minimumsOnly = calculateDebtSnowball(debts, totalMinimums, 0, 0, 0);

  return {
    result,
    minimumsOnly: {
      months: minimumsOnly.months,
      totalInterestPaid: minimumsOnly.totalInterestPaid,
      debtFreeDate: minimumsOnly.debtFreeDate,
    },
    interestSaved: Math.max(0, minimumsOnly.totalInterestPaid - result.totalInterestPaid),
    monthsSaved: Math.max(0, minimumsOnly.months - result.months),
    usesEstimates,
    totalMinimums,
    /** Surplus after essentials and minimums; negative means the budget
     *  can't cover minimums. Null when no budget context was sent. */
    availableForDebt: input.monthlyIncome === undefined ? null : naturalSurplus,
  };
}
