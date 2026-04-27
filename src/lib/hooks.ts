import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Debt, Income, Expense, DebtSummary, BudgetSummary, PayoffPlan, BalanceSnapshot } from '@/types';
import axios, { AxiosError } from 'axios';
import { upgradeEvents } from '@/lib/upgradeEvents';

/**
 * Extract a user-safe error message from Axios/network errors.
 * API routes in this app usually return { error: string } on failure.
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as { error?: string; message?: string } | undefined;
    return body?.error ?? body?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

/** Check if an axios error is a 403 upgrade_required and dispatch event. */
function handleUpgradeError(error: unknown): boolean {
  if (error instanceof AxiosError && error.response?.status === 403) {
    const feature = (error.response.data as { feature?: string })?.feature ?? 'This feature';
    upgradeEvents.dispatch(feature);
    return true;
  }
  return false;
}

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
      return data as { debt: Debt };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<{ debts: Debt[] }>(['debts'], (current) => {
        const existing = current?.debts ?? [];
        return {
          debts: [
            data.debt,
            ...existing.filter((debt) => debt.id !== data.debt.id),
          ],
        };
      });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
    onError: (error) => { handleUpgradeError(error); },
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
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['accelerationStats'] });
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
      return data as { income: Income };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['income'], data);
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

/** Snapshots multiple debts at once for the same month. Upserts by month per debt. */
export function useAddBulkSnapshots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entries: { debtId: string; balance: number; recordedAt: string }[]) => {
      await Promise.all(
        entries.map(({ debtId, balance, recordedAt }) =>
          axios.post(`${API_URL}/api/debts/${debtId}/snapshots`, { balance, recordedAt })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['accelerationStats'] });
    },
  });
}

// ===== AI RECOMMENDATIONS =====

export type AiRecommendationType =
  | 'payoff_advice'
  | 'spending_insight'
  | 'month_change'
  | 'behavior_nudge'
  | 'debt_risk_alert'
  | 'negotiation_suggestion'
  // Legacy types from older cached records.
  | 'strategy'
  | 'cashflow'
  | 'priority'
  | 'savings';

export interface AiRecommendation {
  type: AiRecommendationType;
  impact: 'high' | 'medium' | 'low';
  title: string;
  body: string;
  action: string;
  why?: string;
}

export interface RecommendationCache {
  recommendations: AiRecommendation[] | null;
  dataHash: string | null;
  generatedAt: string | null;
}

export type RecommendationPayload = {
  debts: {
    name: string;
    balance: number;
    interestRate: number;
    minimumPayment: number;
    category: string;
    creditLimit?: number | null;
  }[];
  expenseItems: { name: string; amount: number; category: string }[];
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
  const expenseSignature = [...payload.expenseItems]
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map((e) => `${e.category}:${e.amount.toFixed(0)}`)
    .join(',');
  return [
    totalDebt.toFixed(0),
    totalMin.toFixed(0),
    payload.monthlyTakeHome.toFixed(0),
    payload.essentialExpenses.toFixed(0),
    payload.recurringExpenses.toFixed(0),
    payload.extraPayment.toFixed(0),
    payload.planMonths,
    expenseSignature,
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
    onError: (error) => { handleUpgradeError(error); },
  });
}

// ===== USER PREFERENCES =====

export interface UserPreferences {
  actionChecks: Record<string, boolean>;
  sandboxMethod: string;
  sandboxExtra: number | null;
  splitDebtPercent: number;
  shockMode: string;
  notifyDueDates: boolean;
  notifyLowBuffer: boolean;
  emailOptOut: boolean;
}

export function useUserSettings() {
  return useQuery<{ preferences: UserPreferences }>({
    queryKey: ['preferences'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/preferences`);
      return data;
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (preferences: Partial<UserPreferences>) => {
      const { data } = await axios.patch(`${API_URL}/api/preferences`, preferences);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['preferences'], data);
    },
  });
}

// ===== PAYMENT RECORDS =====

export interface PaymentRecord {
  id: string;
  debtId: string;
  amount: number;
  dueYear: number;
  dueMonth: number;
  paidAt: string;
}

/** Fetches all payment records for a specific month (0-11). */
export function usePaymentRecords(year: number, month: number) {
  return useQuery<{ records: PaymentRecord[] }>({
    queryKey: ['payments', year, month],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/payments?year=${year}&month=${month}`);
      return data;
    },
  });
}

/** Marks a debt payment as paid for a given month. */
export function useMarkPaid() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ debtId, amount, dueYear, dueMonth }: { debtId: string; amount: number; dueYear: number; dueMonth: number }) => {
      const { data } = await axios.post(`${API_URL}/api/payments`, { debtId, amount, dueYear, dueMonth });
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payments'] }),
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['accelerationStats'] }),
        queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
      ]);
    },
  });

  const mutateAsync = async (args: { debtId: string; amount: number; dueYear: number; dueMonth: number }) => {
    // Snapshot BEFORE mutation — cache is cleared in onSuccess
    const cachedDebts = queryClient.getQueryData<{ debts: Debt[] }>(['debts'])?.debts ?? [];
    const targetDebt = cachedDebts.find((d) => d.id === args.debtId);
    const totalDebtOriginal = cachedDebts.reduce((s, d) => s + (d.originalBalance ?? d.balance), 0);
    const totalDebtPaid = cachedDebts.reduce((s, d) => s + ((d.originalBalance ?? d.balance) - d.balance), 0);
    const allPaymentEntries = queryClient.getQueriesData<{ records: PaymentRecord[] }>({ queryKey: ['payments'] });
    const isFirstPayment = allPaymentEntries.every(([, data]) => !data?.records?.length);

    const result = await mutation.mutateAsync(args);

    if (targetDebt) {
      fireCelebration({
        debtId: args.debtId,
        debtName: targetDebt.name,
        amountPaid: args.amount,
        totalDebtPaid: totalDebtPaid + args.amount,
        totalDebtOriginal,
        isFirstPayment,
        debtBalance: Math.max(0, targetDebt.balance - args.amount),
        debtOriginalBalance: targetDebt.originalBalance ?? targetDebt.balance,
        debtCreatedAt: targetDebt.createdAt instanceof Date
          ? targetDebt.createdAt.toISOString()
          : String(targetDebt.createdAt),
      });
    }

    return result;
  };

  return { ...mutation, mutateAsync };
}

function fireCelebration(payload: {
  debtId: string;
  debtName: string;
  amountPaid: number;
  totalDebtPaid: number;
  totalDebtOriginal: number;
  isFirstPayment: boolean;
  debtBalance: number;
  debtOriginalBalance: number;
  debtCreatedAt: string;
}) {
  import('@/lib/celebrationState').then(({ triggerCelebration }) => {
    axios
      .post('/api/ai/payment-celebration', payload)
      .then((res) => {
        const { message, milestoneLabel } = res.data as { message: string; milestoneLabel: string | null };
        triggerCelebration({ message, debtName: payload.debtName, milestoneLabel });
      })
      .catch(() => {
        // silent — never interrupt the payment flow
      });
  });
}

/** Unmarks a payment record (deletes by record id). Also restores the debt balance. */
export function useUnmarkPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId }: { recordId: string; debtId: string; dueYear: number; dueMonth: number }) => {
      await axios.delete(`${API_URL}/api/payments/${recordId}`);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payments'] }),
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['accelerationStats'] }),
      ]);
    },
  });
}

/** Fetches all payment records for a specific debt, newest first. */
export function useDebtPayments(debtId: string) {
  return useQuery<{ records: PaymentRecord[] }>({
    queryKey: ['payments', 'debt', debtId],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/debts/${debtId}/payments`);
      return data;
    },
    enabled: !!debtId,
  });
}

/** Updates a payment record amount and adjusts the debt balance. */
export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, amount }: { recordId: string; debtId: string; amount: number }) => {
      await axios.patch(`${API_URL}/api/payments/${recordId}`, { amount });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payments'] }),
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['accelerationStats'] }),
      ]);
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

// ===== ACCELERATION STATS =====

export interface AccelerationMonthData {
  year: number;
  month: number;
  actualExtra: number;
  onTrack: boolean;
}

export interface AccelerationStats {
  plannedMonthly: number;
  monthlyData: AccelerationMonthData[];
  totalPlanned: number;
  totalActualExtra: number;
  streak: number;
  currentDebtFreeDate: string | null;
  baselineDebtFreeDate: string;
  monthsSaved: number;
  performanceScore: number;
}

/** Fetches rolling 3-month acceleration metrics for the tracker widget. */
export function useAccelerationStats() {
  return useQuery<AccelerationStats>({
    queryKey: ['accelerationStats'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/acceleration-stats`);
      return data;
    },
  });
}

// ===== SUBSCRIPTION =====

export interface SubscriptionInfo {
  paidTier: 'free' | 'pro';
  subscriptionStatus: string;
  subscriptionEndsAt: string | null;
  isCanceling: boolean;
  hasCustomer: boolean;
}

export function useSubscription() {
  return useQuery<SubscriptionInfo>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/user/subscription`);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useStartCheckout() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`${API_URL}/api/stripe/checkout`);
      return data as { url: string };
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}

export function useOpenBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`${API_URL}/api/stripe/portal`);
      return data as { url: string };
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}
