import { type Debt } from '@/types';
import {
  calculateDebtAvalanche,
  calculateDebtCustom,
  calculateDebtSnowball,
  type PayoffMethod,
  type PayoffResult,
} from '@/lib/snowball';
import { isActiveDebt } from '@/lib/monthlyFocusDebt';

export interface PayoffIncomeInput {
  monthlyTakeHome: number;
  essentialExpenses: number;
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
  planStartDate?: Date,
): PayoffResult {
  if (method === 'avalanche') {
    return calculateDebtAvalanche(
      debts,
      income.monthlyTakeHome,
      income.essentialExpenses,
      recurringTotal,
      adjustedExtra,
      planStartDate,
    );
  }

  if (method === 'custom') {
    return calculateDebtCustom(
      debts,
      income.monthlyTakeHome,
      income.essentialExpenses,
      recurringTotal,
      adjustedExtra,
      planStartDate,
    );
  }

  return calculateDebtSnowball(
    debts,
    income.monthlyTakeHome,
    income.essentialExpenses,
    recurringTotal,
    adjustedExtra,
    planStartDate,
  );
}

export function calculatePlanMetrics(
  debts: Debt[],
  income: PayoffIncomeInput | null | undefined,
  expenses: PayoffExpenseInput[],
  options: {
    method?: PayoffMethod | null;
    accelerationAmount?: number | null;
    planStartDate?: Date;
  } = {},
): PlanMetrics | null {
  if (!income || debts.length === 0) return null;

  const activeDebts = debts.filter(isActiveDebt);
  const recurringTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalMinPayments = activeDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  const totalEssential = income.essentialExpenses + recurringTotal;
  // The pool is pure surplus: the legacy income.extraPayment field no longer
  // inflates it. The acceleration amount (slider) is the single control for
  // how much extra goes to debt each month.
  const naturalSurplus =
    income.monthlyTakeHome - totalEssential - totalMinPayments;
  const availableCashFlow = Math.max(0, naturalSurplus);
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
    activeDebts,
    income,
    recurringTotal,
    adjustedExtra,
    method,
    options.planStartDate,
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

export function calculateMinimumsOnlyResult(debts: Debt[], planStartDate?: Date): PayoffResult {
  const activeDebts = debts.filter(isActiveDebt);
  const totalMinPayments = activeDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  return calculateDebtSnowball(activeDebts, totalMinPayments, 0, 0, 0, planStartDate);
}

export function calculateResultForAcceleration(
  debts: Debt[],
  income: PayoffIncomeInput,
  metrics: Pick<PlanMetrics, 'method' | 'recurringTotal' | 'naturalSurplus'>,
  acceleration: number,
  method: PayoffMethod = metrics.method,
  planStartDate?: Date,
): PayoffResult {  const activeDebts = debts.filter(isActiveDebt);
  return calculateResultByMethod(
    activeDebts,
    income,
    metrics.recurringTotal,
    acceleration - metrics.naturalSurplus,
    method,
    planStartDate,
  );
}
