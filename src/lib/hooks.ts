import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Debt, Income, Expense, DebtSummary, BudgetSummary, PayoffPlan, BalanceSnapshot } from '@/types';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
