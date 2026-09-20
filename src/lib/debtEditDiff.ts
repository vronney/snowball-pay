import type { Debt } from '@/types';

/** The shape DebtForm hands to onSubmit in edit mode. */
export type DebtEditPayload = {
  name: string;
  category: Debt['category'];
  balance: number;
  interestRate: number;
  minimumPayment: number;
  creditLimit: number;
  dueDate?: number;
};

/** Fields the edit form can send to PATCH /api/debts/[id]. */
export type DebtEditUpdates = Partial<Omit<DebtEditPayload, 'dueDate'>> & {
  dueDate?: number | null;
};

const NUMERIC_KEYS = ['balance', 'interestRate', 'minimumPayment', 'creditLimit'] as const;

/** Missing/NaN numbers count as 0 — DebtForm emits 0 for an empty credit limit. */
function num(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Reduces an edit-form submission to the fields whose value differs from the
 * debt the form was opened on.
 *
 * DebtForm re-submits every field, so sending the payload as-is overwrote
 * values that changed underneath the open form. The concrete failure: a
 * payment logged moments earlier deducts the balance server-side, then an
 * edit that only touched the due date re-sent the pre-payment balance,
 * reverting it and resetting the month's snapshot. Diffing against the
 * baseline means an untouched balance is never sent.
 */
export function changedDebtFields(
  baseline: Pick<Debt, 'name' | 'category' | 'balance' | 'interestRate' | 'minimumPayment' | 'creditLimit' | 'dueDate'>,
  submitted: DebtEditPayload,
): DebtEditUpdates {
  const updates: DebtEditUpdates = {};

  if (submitted.name !== baseline.name) updates.name = submitted.name;
  if (submitted.category !== baseline.category) updates.category = submitted.category;

  for (const key of NUMERIC_KEYS) {
    if (num(submitted[key]) !== num(baseline[key])) updates[key] = submitted[key];
  }

  const beforeDue = baseline.dueDate ?? null;
  const afterDue = submitted.dueDate ?? null;
  if (afterDue !== beforeDue) updates.dueDate = afterDue;

  return updates;
}
