import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Debt, Income, Expense, DebtSummary, BudgetSummary, PayoffPlan, BalanceSnapshot } from '@/types';
import axios from 'axios';

// Use relative paths so this works on both localhost and Vercel without config.
const API_URL = '';

// ===== DEBTS =====
export function useDebts() {
  return useQuery<{ debts: Debt[] }>({
    queryKey: ['debts'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/debts`);
      return data;
    },
  });
}

export function useDebt(id: string) {
  return useQuery<{ debt: Debt }>({
    queryKey: ['debt', id],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/debts/${id}`);
      return data;
    },
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (debt: Partial<Debt>) => {
      const { data } = await axios.post(`${API_URL}/api/debts`, debt);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
}

export function useUpdateDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Debt> }) => {
      const { data } = await axios.patch(`${API_URL}/api/debts/${id}`, updates);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['debt', variables.id] });
    },
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_URL}/api/debts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
}

// ===== INCOME =====
export function useIncome() {
  return useQuery<{ income: Income | null }>({
    queryKey: ['income'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/income`);
      return data;
    },
  });
}

export function useSaveIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (income: Partial<Income>) => {
      const { data } = await axios.post(`${API_URL}/api/income`, income);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income'] });
    },
  });
}

// ===== EXPENSES =====
export function useExpenses() {
  return useQuery<{ expenses: Expense[] }>({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/expenses`);
      return data;
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expense: Partial<Expense>) => {
      const { data } = await axios.post(`${API_URL}/api/expenses`, expense);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_URL}/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

// ===== PAYOFF PLAN =====
export function useCalculatePayoffPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (options: { method?: 'snowball' | 'avalanche' | 'custom' } = {}) => {
      const { data } = await axios.post(`${API_URL}/api/plan/calculate`, options);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payoffPlan'] });
    },
  });
}

export function usePayoffPlan() {
  return useQuery<{ payoffPlan: PayoffPlan }>({
    queryKey: ['payoffPlan'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/plan`);
      return data;
    },
  });
}

// ===== BALANCE SNAPSHOTS =====

/** Fetches all balance snapshots for the user — used for the Actual vs Projected chart. */
export function useAllSnapshots() {
  return useQuery<{ snapshots: BalanceSnapshot[] }>({
    queryKey: ['snapshots'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/snapshots`);
      return data;
    },
  });
}

/** Logs (or updates) a balance snapshot for a specific debt.  Upserts by month. */
export function useAddSnapshot(debtId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ balance, recordedAt }: { balance: number; recordedAt: string }) => {
      const { data } = await axios.post(`${API_URL}/api/debts/${debtId}/snapshots`, { balance, recordedAt });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
    },
  });
}

// ===== AI RECOMMENDATIONS =====

export interface AiRecommendation {
  type: 'strategy' | 'cashflow' | 'priority' | 'savings';
  impact: 'high' | 'medium' | 'low';
  title: string;
  body: string;
  action: string;
}

export interface RecommendationCache {
  recommendations: AiRecommendation[] | null;
  dataHash: string | null;
  generatedAt: string | null;
}

export type RecommendationPayload = {
  debts: { name: string; balance: number; interestRate: number; minimumPayment: number; category: string }[];
  monthlyTakeHome: number;
  essentialExpenses: number;
  recurringExpenses: number;
  extraPayment: number;
  planMonths: number;
  totalInterestPaid: number;
  availableCashFlow: number;
};

/** Builds the same fingerprint as the server — used client-side for staleness detection. */
export function buildRecommendationHash(payload: RecommendationPayload): string {
  const totalDebt = payload.debts.reduce((s, d) => s + d.balance, 0);
  const totalMin  = payload.debts.reduce((s, d) => s + d.minimumPayment, 0);
  return [
    totalDebt.toFixed(0),
    totalMin.toFixed(0),
    payload.monthlyTakeHome.toFixed(0),
    payload.essentialExpenses.toFixed(0),
    payload.recurringExpenses.toFixed(0),
    payload.extraPayment.toFixed(0),
    payload.planMonths,
  ].join('|');
}

/** Loads the cached recommendations from the database. */
export function useCachedRecommendations() {
  return useQuery<RecommendationCache>({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/recommendations`);
      return data;
    },
  });
}

/** Generates new recommendations via Claude and saves them to the database. */
export function useGenerateRecommendations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RecommendationPayload): Promise<RecommendationCache> => {
      const { data } = await axios.post(`${API_URL}/api/recommendations`, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['recommendations'], data);
    },
  });
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ debtId, snapshotId }: { debtId: string; snapshotId: string }) => {
      await axios.delete(`${API_URL}/api/debts/${debtId}/snapshots/${snapshotId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
    },
  });
}
