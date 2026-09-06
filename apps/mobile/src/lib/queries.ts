import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { api } from './api';
import type {
  CalculateInput,
  CalculateResponse,
  Debt,
  DebtCategory,
  Expense,
  Income,
  PayoffMethod,
  Subscription,
} from './types';

/** Server state lives here (TanStack Query) — never in the Zustand store. */

export const keys = {
  debts: ['debts'] as const,
  income: ['income'] as const,
  expenses: ['expenses'] as const,
  subscription: ['subscription'] as const,
  calculate: (input: CalculateInput) => ['calculate', input] as const,
};

export function useDebts() {
  return useQuery({
    queryKey: keys.debts,
    queryFn: () => api<{ debts: Debt[] }>('/api/debts').then((r) => r.debts),
  });
}

export function useIncome() {
  return useQuery({
    queryKey: keys.income,
    queryFn: () => api<{ income: Income | null }>('/api/income').then((r) => r.income),
  });
}

export function useExpenses() {
  return useQuery({
    queryKey: keys.expenses,
    queryFn: () => api<{ expenses: Expense[] }>('/api/expenses').then((r) => r.expenses),
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: keys.subscription,
    queryFn: () => api<Subscription>('/api/user/subscription'),
    staleTime: 5 * 60 * 1000,
  });
}

export function calculatePlan(input: CalculateInput) {
  return api<CalculateResponse>('/api/plan/calculate', { method: 'POST', body: input, auth: false });
}

export function useCalculate(
  input: CalculateInput | null,
  options: Pick<UseQueryOptions<CalculateResponse>, 'placeholderData'> = {},
) {
  return useQuery({
    queryKey: keys.calculate(input ?? { debts: [] }),
    queryFn: () => calculatePlan(input!),
    enabled: input !== null && input.debts.length > 0,
    staleTime: 60 * 1000,
    ...options,
  });
}

/**
 * The saved plan as the dashboard computes it — same inputs the web
 * dashboard feeds calculatePlanMetrics: active debts, the income row's
 * method, recurring expenses (summed as-is, like the web), and the
 * acceleration slider (null = full surplus).
 */
export function planInputFromServer(
  debts: Debt[],
  income: Income | null,
  expenses: Expense[] = [],
): CalculateInput | null {
  const active = debts.filter((d) => d.balance > 0.01);
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

export interface SavePlanPayload {
  income: {
    monthlyTakeHome: number;
    essentialExpenses: number;
    extraPayment: number;
    payoffMethod: PayoffMethod;
  };
  debts: {
    name: string;
    category: DebtCategory;
    balance: number;
    interestRate: number;
    minimumPayment: number;
    /** 1-based attack position; only sent for the custom method. */
    priorityOrder?: number;
  }[];
}

export interface SavePlanResult {
  incomeId: string;
  debtIds: string[];
  skippedDebts: number;
}

/** "Save my plan": commits the calculator session exactly as shown (web parity with /onboarding). */
export function useSavePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SavePlanPayload) =>
      api<SavePlanResult>('/api/onboarding/complete', {
        method: 'POST',
        body: payload,
        headers: { 'x-idempotency-key': Crypto.randomUUID() },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.debts });
      queryClient.invalidateQueries({ queryKey: keys.income });
    },
  });
}

/** The wedge: a one-tap extra payment ("snowflake") logged against a debt. */
export function useLogExtraPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ debtId, amount }: { debtId: string; amount: number }) => {
      const now = new Date();
      return api<{ updatedBalance: number }>('/api/payments', {
        method: 'POST',
        body: { debtId, amount, dueYear: now.getFullYear(), dueMonth: now.getMonth(), mode: 'log' },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.debts }),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => api<{ success: boolean }>('/api/user/data', { method: 'DELETE' }),
  });
}
