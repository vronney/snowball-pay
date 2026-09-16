import type { CalculateInput, Debt, Expense, Income, PayoffMethod } from './types';

/**
 * The saved plan as the dashboard computes it — same inputs the web
 * dashboard feeds calculatePlanMetrics: the active debts the plan counts (a
 * debt saved outside the plan on Free is left out, like the web, spec §6.2),
 * the income row's method, recurring expenses (summed as-is, like the web),
 * and the acceleration slider (null = full surplus).
 */
export function planInputFromServer(
  debts: Debt[],
  income: Income | null,
  expenses: Expense[] = [],
): CalculateInput | null {
  const active = debts.filter((d) => d.balance > 0.01 && d.inPlan !== false);
  if (!income || active.length === 0) return null;
  const totalMin = active.reduce((sum, d) => sum + d.minimumPayment, 0);
  const recurring = expenses.reduce((sum, e) => sum + e.amount, 0);
  // The engine treats essentials + recurring as one figure, so fold them.
  const essentials = income.essentialExpenses + recurring;
  const surplus = Math.max(0, income.monthlyTakeHome - essentials - totalMin);
  const extra =
    income.accelerationAmount == null ? surplus : Math.min(income.accelerationAmount, surplus);
  const method: PayoffMethod =
    income.payoffMethod === 'avalanche' || income.payoffMethod === 'custom'
      ? income.payoffMethod
      : 'snowball';
  return {
    method,
    extraPayment: extra,
    monthlyIncome: income.monthlyTakeHome,
    essentialExpenses: essentials,
    debts: active.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      balance: d.balance,
      interestRate: d.interestRate,
      minimumPayment: d.minimumPayment,
      priorityOrder: d.priorityOrder ?? undefined,
    })),
  };
}
