import { create } from 'zustand';
import { parseNumericInput } from '@/lib/format';
import { ESTIMATED_APR_BY_CATEGORY, estimateMinimumPayment } from '@/lib/estimates';
import type { CalculateInput, DebtCategory, PayoffMethod } from '@/lib/types';
import type { SavePlanPayload } from '@/lib/queries';

/**
 * UI-only state for the no-login calculator → plan builder → save gate.
 * Server responses never live here. In-memory on purpose: the Auth0 sign-in
 * sheet keeps the app process alive, so the draft survives the round trip.
 */

export interface DebtRow {
  id: string;
  name: string;
  category: DebtCategory;
  balance: string;
  rate: string;
  minimum: string;
}

/** Same seed the web calculator opens with — a real payoff date in seconds. */
const SEED_ROWS: DebtRow[] = [
  { id: 'seed-1', name: 'Credit Card', category: 'Credit Card', balance: '14200', rate: '24.99', minimum: '285' },
  { id: 'seed-2', name: 'Car Loan', category: 'Auto Loan', balance: '4800', rate: '6.9', minimum: '145' },
  { id: 'seed-3', name: 'Student Loan', category: 'Student Loan', balance: '22500', rate: '5.2', minimum: '210' },
];

const DEFAULTS = { takeHome: '5200', essential: '2400', extra: '200' };

/** Endowed progress: the calculator counts as step 1, so save never starts at 0%. */
export const PLAN_STEPS = ['Your numbers', 'Your plan', 'Save'];

interface CalculatorState {
  rows: DebtRow[];
  takeHome: string;
  essential: string;
  extra: string;
  method: PayoffMethod;
  planName: string;
  /** True until the user edits anything — drives the "sample numbers" badge. */
  isSample: boolean;
  updateRow: (id: string, patch: Partial<Omit<DebtRow, 'id'>>) => void;
  addRow: () => void;
  removeRow: (id: string) => void;
  moveRow: (id: string, direction: -1 | 1) => void;
  setBudget: (field: 'takeHome' | 'essential' | 'extra', value: string) => void;
  setMethod: (method: PayoffMethod) => void;
  setPlanName: (name: string) => void;
  clearSample: () => void;
  reset: () => void;
}

let nextId = 1;

export const useCalculatorStore = create<CalculatorState>((set) => ({
  rows: SEED_ROWS,
  ...DEFAULTS,
  method: 'snowball',
  planName: '',
  isSample: true,
  updateRow: (id, patch) =>
    set((s) => ({
      isSample: false,
      rows: s.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),
  addRow: () =>
    set((s) => ({
      isSample: false,
      rows: [
        ...s.rows,
        { id: `row-${nextId++}`, name: '', category: 'Credit Card', balance: '', rate: '', minimum: '' },
      ],
    })),
  removeRow: (id) => set((s) => ({ isSample: false, rows: s.rows.filter((r) => r.id !== id) })),
  moveRow: (id, direction) =>
    set((s) => {
      const index = s.rows.findIndex((r) => r.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= s.rows.length) return s;
      const rows = [...s.rows];
      [rows[index], rows[target]] = [rows[target], rows[index]];
      return { rows, method: 'custom' };
    }),
  setBudget: (field, value) => set({ [field]: value, isSample: false }),
  setMethod: (method) => set({ method }),
  setPlanName: (planName) => set({ planName }),
  clearSample: () =>
    set({
      isSample: false,
      rows: [{ id: `row-${nextId++}`, name: '', category: 'Credit Card', balance: '', rate: '', minimum: '' }],
      takeHome: '',
      essential: '',
      extra: '',
    }),
  reset: () => set({ rows: SEED_ROWS, ...DEFAULTS, method: 'snowball', planName: '', isSample: true }),
}));

export interface RowIssue {
  balance?: string;
  rate?: string;
  minimum?: string;
}

/** Inline format problems per row (blank APR/minimum is fine — the API estimates). */
export function rowIssues(row: DebtRow): RowIssue {
  const issues: RowIssue = {};
  const balance = parseNumericInput(row.balance);
  if (row.balance.trim() !== '' && (balance === null || balance < 0)) issues.balance = 'Enter a dollar amount';
  const rate = parseNumericInput(row.rate);
  if (row.rate.trim() !== '' && (rate === null || rate < 0 || rate > 100)) issues.rate = 'APR is 0–100';
  const minimum = parseNumericInput(row.minimum);
  if (row.minimum.trim() !== '' && (minimum === null || minimum < 0)) issues.minimum = 'Enter a dollar amount';
  return issues;
}

function positiveOrUndefined(raw: string): number | undefined {
  const n = parseNumericInput(raw);
  return n !== null && n >= 0 ? n : undefined;
}

/** Rows that count toward the plan: a positive balance and no format errors. */
export function countedRows(rows: DebtRow[]): DebtRow[] {
  return rows.filter((r) => {
    const balance = parseNumericInput(r.balance);
    return balance !== null && balance > 0 && Object.keys(rowIssues(r)).length === 0;
  });
}

export function toCalculateInput(s: Pick<CalculatorState, 'rows' | 'takeHome' | 'essential' | 'extra' | 'method'>): CalculateInput | null {
  const rows = countedRows(s.rows);
  if (rows.length === 0) return null;
  const takeHome = positiveOrUndefined(s.takeHome);
  return {
    method: s.method,
    extraPayment: positiveOrUndefined(s.extra) ?? 0,
    monthlyIncome: takeHome,
    essentialExpenses: takeHome === undefined ? undefined : positiveOrUndefined(s.essential) ?? 0,
    debts: rows.map((r, i) => ({
      id: r.id,
      name: r.name.trim() || `Debt ${i + 1}`,
      category: r.category,
      balance: parseNumericInput(r.balance)!,
      interestRate: positiveOrUndefined(r.rate),
      minimumPayment: positiveOrUndefined(r.minimum),
      priorityOrder: s.method === 'custom' ? i + 1 : undefined,
    })),
  };
}

/**
 * The exact plan the user was shown, ready for /api/onboarding/complete.
 * Blank fields resolve with the same estimates the API used, so the saved
 * debts reproduce the date on screen.
 */
export function toSavePayload(
  s: Pick<CalculatorState, 'rows' | 'takeHome' | 'essential' | 'extra' | 'method'>,
): SavePlanPayload | null {
  const input = toCalculateInput(s);
  if (!input) return null;
  const rows = countedRows(s.rows);
  return {
    income: {
      monthlyTakeHome: input.monthlyIncome ?? 0,
      essentialExpenses: input.essentialExpenses ?? 0,
      extraPayment: input.extraPayment ?? 0,
      payoffMethod: s.method,
    },
    debts: rows.map((r, i) => {
      const balance = parseNumericInput(r.balance)!;
      return {
        name: r.name.trim() || `Debt ${i + 1}`,
        category: r.category,
        balance,
        interestRate: positiveOrUndefined(r.rate) ?? ESTIMATED_APR_BY_CATEGORY[r.category],
        minimumPayment: positiveOrUndefined(r.minimum) ?? estimateMinimumPayment(balance),
      };
    }),
  };
}
