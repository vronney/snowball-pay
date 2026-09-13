import { isActiveDebt } from '@/lib/monthlyFocusDebt';
import type { PlanReadiness, ReadinessStep } from './types';

export interface ReadinessInput {
  debts: ReadonlyArray<{ balance: number; dueDate?: number | null }>;
  income: { monthlyTakeHome: number; essentialExpenses: number } | null;
  recurringExpenseCount: number;
  hasAnyPayment: boolean;
}

function step(id: ReadinessStep['id'], complete: boolean, pendingWhenIncomplete = 1): ReadinessStep {
  return { id, complete, pendingCount: complete ? 0 : pendingWhenIncomplete };
}

/**
 * Five-step plan readiness (spec §5.1). Opens at the user's real progress, so
 * most dashboard users start at 3 of 5 (endowed progress, README §1a).
 */
export function computePlanReadiness(input: ReadinessInput): PlanReadiness {
  const active = input.debts.filter(isActiveDebt);
  const missingDueDays = active.filter((d) => d.dueDate == null).length;
  const takeHome = input.income?.monthlyTakeHome ?? 0;
  const essentials = input.income?.essentialExpenses ?? 0;

  const steps: ReadinessStep[] = [
    step('debts', active.length > 0),
    step('income', takeHome > 0),
    step('expenses', essentials > 0 || input.recurringExpenseCount > 0),
    step('dueDates', active.length > 0 && missingDueDays === 0, missingDueDays),
    step('firstPayment', input.hasAnyPayment),
  ];
  const completeCount = steps.filter((s) => s.complete).length;
  return { steps, completeCount, percent: Math.round((completeCount / steps.length) * 100) };
}

/** The step the readiness CTA opens, or null at 5 of 5 (the card then hides). */
export function firstIncompleteStep(readiness: PlanReadiness): ReadinessStep | null {
  return readiness.steps.find((s) => !s.complete) ?? null;
}
