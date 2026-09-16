import type { PayoffMethod, PayoffResult } from '@/lib/snowball';
import { formatCurrency, formatCurrencyWhole, formatMonths } from '@/lib/utils';
import { strategyVerdict } from '@/components/payoff/strategyVerdict';
import { isRungApplicable, ladderHeadroom, rungCaption } from '@/components/payoff/whatIfLadder';
import type { PlanGap } from './types';

type ResultTotals = Pick<PayoffResult, 'months' | 'totalInterestPaid'>;

const METHOD_LABEL: Record<PayoffMethod, string> = { snowball: 'Snowball', avalanche: 'Avalanche', custom: 'Custom' };

export function methodLabel(method: PayoffMethod): string {
  return METHOD_LABEL[method];
}

// ── Strategy (spec §8.5 My Plan; README §3a) ──────────────────────────────

export interface StrategyPairView {
  yours: { label: string; figure: string };
  other: { label: string; figure: string; cheaper: boolean };
  /** strategyVerdict's sentence. It already says so when the current method is the cheaper one. */
  caption: string;
}

/**
 * The comparison pair under the control. `alternative` is PayoffTab's own
 * alternative result (PayoffTab.tsx:265-278), so both figures share one
 * basis. Null for custom ordering or when there is no alternative. Figures
 * use formatCurrencyWhole, as v1's StrategyComparison does for the same totals.
 */
export function strategyPairView(args: {
  method: PayoffMethod;
  current: ResultTotals;
  alternative: ResultTotals | null;
}): StrategyPairView | null {
  const { method, current, alternative } = args;
  if (method === 'custom' || !alternative) return null;
  const strategyName = METHOD_LABEL[method];
  const comparisonName = METHOD_LABEL[method === 'avalanche' ? 'snowball' : 'avalanche'];
  return {
    yours: { label: `Yours · ${strategyName}`, figure: formatCurrencyWhole(current.totalInterestPaid) },
    other: {
      label: comparisonName,
      figure: formatCurrencyWhole(alternative.totalInterestPaid),
      // Rounded first, like the verdict: sub-dollar noise is not "cheaper".
      cheaper: Math.round(alternative.totalInterestPaid) < Math.round(current.totalInterestPaid),
    },
    caption: strategyVerdict({
      strategyName,
      comparisonName,
      currentMonths: current.months,
      currentInterest: current.totalInterestPaid,
      comparisonMonths: alternative.months,
      comparisonInterest: alternative.totalInterestPaid,
    }),
  };
}

// ── Acceleration (README §3b) ─────────────────────────────────────────────

export interface AccelerationView { value: string; max: number; maxLabel: string }

/** Null without available cash flow: v1 hides its slider the same way (CashFlowOverview.tsx:64). */
export function accelerationView(effectiveAcceleration: number, availableCashFlow: number): AccelerationView | null {
  if (!Number.isFinite(availableCashFlow) || availableCashFlow <= 0) return null;
  return {
    value: formatCurrency(effectiveAcceleration),
    max: availableCashFlow,
    maxLabel: `${formatCurrency(availableCashFlow)} available`,
  };
}

// ── What-if (README §3c; spec §8.5) ───────────────────────────────────────

export const FREE_WHAT_IF_DELTA = 25;
export const GATED_WHAT_IF_DELTA = 100;
/** Deviation X11: no "a month" (there is no monthly reset) and no "any date" (not a feature). */
export const WHAT_IF_CAPTION = 'One scenario is yours. Pro runs any amount, side by side.';

export interface WhatIfFreeTile { label: string; result: string }

/** The free rung. Null when it changes neither months nor interest: hide, never "no change". */
export function whatIfFreeTile(current: ResultTotals, withExtra: ResultTotals): WhatIfFreeTile | null {
  const savedMonths = current.months - withExtra.months;
  const savedInterest = Math.max(0, current.totalInterestPaid - withExtra.totalInterestPaid);
  if (savedMonths <= 0 && savedInterest <= 0) return null;
  return {
    label: `+$${FREE_WHAT_IF_DELTA}/mo`,
    result: rungCaption({ delta: FREE_WHAT_IF_DELTA, savedMonths, savedInterest }, Infinity, true),
  };
}

export interface AnyAmountView {
  months: string;
  interest: string;
  caption: string;
  canApply: boolean;
  /** WhatIfCard.handleApply's clamp: never above the available cash flow. */
  nextAcceleration: number;
}

/** Pro's any-amount scenario: WhatIfCard's ladder rules (whatIfLadder.ts) for one typed rung. */
export function anyAmountView(args: {
  delta: number;
  current: ResultTotals;
  withExtra: ResultTotals;
  availableCashFlow: number;
  effectiveAcceleration: number;
}): AnyAmountView | null {
  const { delta, current, withExtra, availableCashFlow, effectiveAcceleration } = args;
  if (!Number.isFinite(delta) || delta <= 0) return null;
  const headroom = ladderHeadroom(availableCashFlow, effectiveAcceleration);
  const canApply = isRungApplicable(delta, headroom, true, effectiveAcceleration);
  const savedMonths = current.months - withExtra.months;
  const savedInterest = Math.max(0, current.totalInterestPaid - withExtra.totalInterestPaid);
  return {
    months: formatMonths(withExtra.months),
    interest: `${formatCurrencyWhole(withExtra.totalInterestPaid)} interest`,
    caption: rungCaption({ delta, savedMonths, savedInterest }, headroom, canApply),
    canApply,
    nextAcceleration: Math.min(effectiveAcceleration + delta, availableCashFlow),
  };
}

// ── The red closing card (spec §8.4 "Plan closing") ───────────────────────

export interface PlanClosingView {
  eyebrow: string;
  figure: string;
  text: string;
  cta: { kind: 'fix' | 'log'; label: string } | null;
}

/**
 * Shown only when behind (planGap.amount < 0: usePlannerComputed semantics,
 * positive = ahead). Spec §13 keeps the verbatim formula and shows only this
 * side. The CTA order is the spec's: fix while cash flow is unused, else log
 * while payments are missed, else none. The gap is a balance difference, so
 * it keeps its cents.
 */
export function planClosingView(args: { planGap: PlanGap | null; canFix: boolean; missedCount: number }): PlanClosingView | null {
  const gap = args.planGap;
  if (!gap || !Number.isFinite(gap.amount) || gap.amount >= 0) return null;
  const behind = formatCurrency(-gap.amount);
  if (behind === formatCurrency(0)) return null;
  return {
    eyebrow: 'Plan vs actual',
    figure: `${behind} behind`,
    text: `Balances are ${behind} above where the plan expected by ${gap.asOfMonth}.`,
    cta: args.canFix
      ? { kind: 'fix', label: 'Fix it in one tap' }
      : args.missedCount > 0
        ? { kind: 'log', label: "Log this month's payments" }
        : null,
  };
}

/** After "Fix it in one tap": the recalculated plan's end, formatted as PayoffTab formats the share card's date. */
export function fixAppliedNote(debtFreeDate: Date): string {
  return `Applied — your plan now ends ${debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`;
}
