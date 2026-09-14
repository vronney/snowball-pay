import type { Debt } from '@/types';
import { isActiveDebt } from '@/lib/monthlyFocusDebt';
import { formatCurrencyWhole, formatMonths } from '@/lib/utils';
import { coachMoveCopy, type CoachMoveCopy } from './coachMoveCopy';
import { floorDollars, floorWhole, monthYearLabel, shortMonthLabel } from './format';
import { computeThisMonthPaidProgress } from './progress';
import { firstIncompleteStep } from './readiness';
import type {
  CoachMove, DashboardInsights, MonthlyInterest, PaymentGap, PlanReadiness,
  PlanSummary, RateWatch, ReadinessStep, ReadinessStepId,
} from './types';

// ── Readiness (spec §8.4 "Readiness") ─────────────────────────────────────

const STEP_LABELS: Record<ReadinessStepId, string> = {
  debts: 'Debts',
  income: 'Income',
  expenses: 'Expenses',
  dueDates: 'Due dates',
  firstPayment: 'First payment',
};

export interface ReadinessChip { id: ReadinessStepId; label: string; complete: boolean }
export interface ReadinessView {
  title: string;
  counter: string;
  percent: number;
  chips: ReadinessChip[];
  cta: { step: ReadinessStepId; label: string };
}

export function readinessCtaLabel(step: ReadinessStep): string {
  switch (step.id) {
    case 'debts': return 'Add your debts';
    case 'income': return 'Add your income';
    case 'expenses': return 'Add your expenses';
    case 'dueDates': return step.pendingCount === 1 ? 'Add 1 due date' : `Add ${step.pendingCount} due dates`;
    case 'firstPayment': return 'Log your first payment';
  }
}

/** Null at 5 of 5: the card disappears (spec §8.5). */
export function readinessView(readiness: PlanReadiness): ReadinessView | null {
  const next = firstIncompleteStep(readiness);
  if (!next) return null;
  return {
    title: `Your plan is ${readiness.percent}% set up`,
    counter: `${readiness.completeCount} of ${readiness.steps.length}`,
    percent: readiness.percent,
    // An unfinished step with nothing to count (due dates before any debt
    // exists) has no action of its own yet, so its chip stays hidden.
    chips: readiness.steps
      .filter((s) => s.complete || s.pendingCount > 0)
      .map((s) => ({ id: s.id, label: STEP_LABELS[s.id], complete: s.complete })),
    cta: { step: next.id, label: readinessCtaLabel(next) },
  };
}

export type ReadinessTarget =
  | { kind: 'tab'; tab: 'debts' | 'income' }
  | { kind: 'dueDatesSheet' }
  | { kind: 'firstPaymentSheet' };

/** Where a readiness chip or CTA leads: the step's flow while unfinished, its home once done. */
export function readinessTarget(step: ReadinessStep): ReadinessTarget {
  switch (step.id) {
    case 'debts': return { kind: 'tab', tab: 'debts' };
    case 'income':
    case 'expenses': return { kind: 'tab', tab: 'income' };
    case 'dueDates': return step.complete ? { kind: 'tab', tab: 'debts' } : { kind: 'dueDatesSheet' };
    case 'firstPayment': return step.complete ? { kind: 'tab', tab: 'debts' } : { kind: 'firstPaymentSheet' };
  }
}

// ── Interest (D3, X1, X2) ─────────────────────────────────────────────────

export interface InterestView {
  figure: string;
  avgLine: string | null;
  /** Red share of the bar, 0-100. Null: no bar (no real average to compare with). */
  lenderShare: number | null;
}

/** Null (card hides) unless this month's estimate floors to at least $1. */
export function interestView(interest: MonthlyInterest | null): InterestView | null {
  if (!interest || !Number.isFinite(interest.monthlyEstimate)) return null;
  const monthly = floorDollars(interest.monthlyEstimate);
  if (monthly < 1) return null;
  const figure = formatCurrencyWhole(monthly);
  const rawAvg = interest.avgMonthlySavedByPlan;
  const avg = rawAvg != null && Number.isFinite(rawAvg) ? floorDollars(rawAvg) : 0;
  if (avg < 1) return { figure, avgLine: null, lenderShare: null };
  return {
    figure,
    avgLine: `≈${formatCurrencyWhole(avg)}/mo your plan saves vs minimums (avg)`,
    lenderShare: (monthly / (monthly + avg)) * 100,
  };
}

// ── Debt-free hero (spec §8.4 "Hero") ──────────────────────────────────────

export interface HeroView { dateLabel: string; toGo: string; paidPct: number }

/**
 * Null without a plan (none, or capped at 360 months: hide, don't fake).
 * paidPct is v1 This Month's gauge exactly (DebtFreeCountdownHero): principal
 * paid across all debts over their starting total, clamped to 0-100.
 */
export function heroView(
  plan: PlanSummary | null,
  debts: ReadonlyArray<Pick<Debt, 'balance' | 'originalBalance'>>,
): HeroView | null {
  if (!plan || plan.months <= 0) return null;
  const dateLabel = monthYearLabel(plan.debtFreeDate);
  if (!dateLabel) return null;
  const { totalPaid, totalOriginal } = computeThisMonthPaidProgress(debts);
  const paidPct = totalOriginal > 0 ? Math.min(100, Math.max(0, (totalPaid / totalOriginal) * 100)) : 0;
  return { dateLabel, toGo: `${formatMonths(plan.months)} to go`, paidPct };
}

// ── Rate watch (X10) ──────────────────────────────────────────────────────

export interface RateWatchView { eyebrow: string; figure: string; caption: string }

export function rateWatchView(rateWatch: RateWatch | null): RateWatchView | null {
  if (!rateWatch || floorDollars(rateWatch.annualEstimate) < 1) return null;
  const one = rateWatch.cards === 1;
  return {
    eyebrow: `Rate watch · ${rateWatch.cards} ${one ? 'card' : 'cards'}`,
    figure: `${floorWhole(rateWatch.annualEstimate)}/yr`,
    caption: one ? 'est. if this card drops to its target rate' : 'est. if your cards drop to their target rates',
  };
}

// ── The free move (README §1d) ─────────────────────────────────────────────

export type FreeMoveAction = 'bulk_log' | 'switch_strategy' | 'open_plan';
export interface FreeMoveView {
  move: CoachMove;
  eyebrow: string;
  priority: 'High' | 'Medium';
  copy: CoachMoveCopy;
  cta: { action: FreeMoveAction; label: string } | null;
  /** Gated moves behind the free one. 0: no "more moves" row. */
  moreCount: number;
}

const METHOD_LABEL = { snowball: 'Snowball', avalanche: 'Avalanche' } as const;

export function freeMoveCta(move: CoachMove): FreeMoveView['cta'] {
  switch (move.id) {
    case 'log_missed':
      return { action: 'bulk_log', label: move.facts.missedCount === 1 ? 'Log it now' : 'Log them now' };
    case 'switch_strategy':
      return { action: 'switch_strategy', label: `Switch to ${METHOD_LABEL[move.facts.alternative]}` };
    case 'use_unallocated':
      return { action: 'open_plan', label: 'Open My Plan' };
    case 'call_apr':
      // The APR call script is Pro today (IntelligenceTab); the move's own
      // copy is the action. PR 5 (Coach) decides whether Free gets the script.
      return null;
  }
}

/** Free users only. Pro and trial users get the AI brief in this slot. */
export function freeMoveView(insights: Pick<DashboardInsights, 'tier' | 'coachMoves' | 'asOf'>): FreeMoveView | null {
  if (insights.tier.proEligible) return null;
  const [move, ...rest] = insights.coachMoves;
  if (!move || !move.isFree) return null;
  return {
    move,
    eyebrow: `Your free move · ${shortMonthLabel(insights.asOf.month)}`,
    priority: move.priority === 'high' ? 'High' : 'Medium',
    copy: coachMoveCopy(move),
    cta: freeMoveCta(move),
    moreCount: rest.filter((m) => !m.isFree).length,
  };
}

// ── Sheet rows ─────────────────────────────────────────────────────────────

export interface LogRow { debtId: string; name: string; amount: number }

/** The month's missed payments at their minimums (spec §8.3 BulkLogSheet). */
export function missedPaymentRows(
  gap: PaymentGap | null,
  debts: ReadonlyArray<Pick<Debt, 'id' | 'name'>>,
): LogRow[] {
  if (!gap) return [];
  const names = new Map(debts.map((d) => [d.id, d.name]));
  return gap.missed.flatMap((m) => {
    const name = names.get(m.debtId);
    return name === undefined ? [] : [{ debtId: m.debtId, name, amount: m.minimumPayment }];
  });
}

/** "Log your first payment": every active debt at its minimum. */
export function activeDebtRows(
  debts: ReadonlyArray<Pick<Debt, 'id' | 'name' | 'balance' | 'minimumPayment'>>,
): LogRow[] {
  return debts.filter(isActiveDebt).map((d) => ({ debtId: d.id, name: d.name, amount: d.minimumPayment }));
}

/** Active debts without a due day: the ones readiness counts (readiness.ts). */
export function debtsMissingDueDate<T extends Pick<Debt, 'balance' | 'dueDate'>>(debts: ReadonlyArray<T>): T[] {
  return debts.filter((d) => isActiveDebt(d) && d.dueDate == null);
}
