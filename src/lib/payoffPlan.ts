import { type Debt } from '@/types';
import {
  calculateDebtAvalanche,
  calculateDebtCustom,
  calculateDebtSnowball,
  type PayoffMethod,
  type PayoffResult,
} from '@/lib/snowball';

export interface PayoffIncomeInput {
  monthlyTakeHome: number;
  essentialExpenses: number;
  extraPayment?: number | null;
  payoffMethod?: string | null;
  accelerationAmount?: number | null;
}

export interface PayoffExpenseInput {
  amount: number;
}

export interface PlanMetrics {
  result: PayoffResult;
  method: PayoffMethod;
  recurringTotal: number;
  totalMinPayments: number;
  totalEssential: number;
  naturalSurplus: number;
  availableCashFlow: number;
  effectiveAcceleration: number;
  adjustedExtra: number;
}

export function isPayoffMethod(value: unknown): value is PayoffMethod {
  return value === 'snowball' || value === 'avalanche' || value === 'custom';
}

export function methodFromIncome(
  income: PayoffIncomeInput,
  methodOverride?: PayoffMethod | null,
): PayoffMethod {
  if (methodOverride) return methodOverride;
  return isPayoffMethod(income.payoffMethod) ? income.payoffMethod : 'snowball';
}

export function calculateResultByMethod(
  debts: Debt[],
  income: PayoffIncomeInput,
  recurringTotal: number,
  adjustedExtra: number,
  method: PayoffMethod,
): PayoffResult {
  if (method === 'avalanche') {
    return calculateDebtAvalanche(
      debts,
      income.monthlyTakeHome,
      income.essentialExpenses,
      recurringTotal,
      adjustedExtra,
    );
  }

  if (method === 'custom') {
    return calculateDebtCustom(
      debts,
      income.monthlyTakeHome,
      income.essentialExpenses,
      recurringTotal,
      adjustedExtra,
    );
  }

  return calculateDebtSnowball(
    debts,
    income.monthlyTakeHome,
    income.essentialExpenses,
    recurringTotal,
    adjustedExtra,
  );
}

export function calculatePlanMetrics(
  debts: Debt[],
  income: PayoffIncomeInput | null | undefined,
  expenses: PayoffExpenseInput[],
  options: {
    method?: PayoffMethod | null;
    accelerationAmount?: number | null;
  } = {},
): PlanMetrics | null {
  if (!income || debts.length === 0) return null;

  const recurringTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalMinPayments = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  const totalEssential = income.essentialExpenses + recurringTotal;
  const naturalSurplus =
    income.monthlyTakeHome - totalEssential - totalMinPayments;
  const availableCashFlow = Math.max(
    0,
    naturalSurplus + (income.extraPayment ?? 0),
  );
  const requestedAcceleration =
    options.accelerationAmount === undefined
      ? income.accelerationAmount
      : options.accelerationAmount;
  const effectiveAcceleration =
    requestedAcceleration != null
      ? Math.min(requestedAcceleration, availableCashFlow)
      : availableCashFlow;
  const adjustedExtra = effectiveAcceleration - naturalSurplus;
  const method = methodFromIncome(income, options.method);
  const result = calculateResultByMethod(
    debts,
    income,
    recurringTotal,
    adjustedExtra,
    method,
  );

  return {
    result,
    method,
    recurringTotal,
    totalMinPayments,
    totalEssential,
    naturalSurplus,
    availableCashFlow,
    effectiveAcceleration,
    adjustedExtra,
  };
}

export function calculateMinimumsOnlyResult(debts: Debt[]): PayoffResult {
  const totalMinPayments = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  return calculateDebtSnowball(debts, totalMinPayments, 0, 0, 0);
}

export function calculateResultForAcceleration(
  debts: Debt[],
  income: PayoffIncomeInput,
  metrics: Pick<PlanMetrics, 'method' | 'recurringTotal' | 'naturalSurplus'>,
  acceleration: number,
  method: PayoffMethod = metrics.method,
): PayoffResult {
  return calculateResultByMethod(
    debts,
    income,
    metrics.recurringTotal,
    acceleration - metrics.naturalSurplus,
    method,
  );
}
