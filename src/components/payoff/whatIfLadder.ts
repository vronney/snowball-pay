import { formatCurrencyWhole, formatMonths } from '@/lib/utils';

/**
 * Pure logic behind the what-if ladder, extracted so the honesty rules are
 * testable without rendering. The rules that matter:
 *
 *  - A rung is only clickable when the plan can actually absorb it. Apply
 *    clamps to availableCashFlow, so offering a rung above the remaining
 *    headroom would deliver less than the tile promised.
 *  - A caption never claims a saving the simulation didn't produce.
 */

export interface LadderRung {
  delta: number;
  savedMonths: number;
  savedInterest: number;
}

/**
 * Room left before an applied rung would be clamped.
 *
 * Undefined cash-flow data means "unconstrained" rather than "zero": the card
 * is handed these as optional props, and treating a missing value as no room
 * would silently disable every rung.
 */
export function ladderHeadroom(
  availableCashFlow?: number,
  effectiveAcceleration?: number,
): number {
  if (availableCashFlow === undefined || effectiveAcceleration === undefined) {
    return Infinity;
  }
  return Math.max(0, availableCashFlow - effectiveAcceleration);
}

/** A rung can be applied only with a handler, known acceleration, and room. */
export function isRungApplicable(
  delta: number,
  headroom: number,
  hasHandler: boolean,
  effectiveAcceleration?: number,
): boolean {
  return hasHandler && effectiveAcceleration !== undefined && delta <= headroom;
}

/**
 * The line under each rung. Out-of-reach rungs say what they'd need; reachable
 * ones report only the improvements that actually materialized — a rung can cut
 * interest without moving the payoff month, and vice versa.
 */
export function rungCaption(
  rung: LadderRung,
  headroom: number,
  applicable: boolean,
): string {
  if (!applicable) {
    // Finite headroom is guaranteed here: an infinite headroom makes every
    // rung applicable, so this branch is only reached with a real shortfall.
    return `needs ${formatCurrencyWhole(rung.delta - headroom)} more room`;
  }
  const { savedMonths, savedInterest } = rung;
  if (savedInterest > 0 && savedMonths > 0) {
    return `${formatMonths(savedMonths)} sooner · saves ${formatCurrencyWhole(savedInterest)}`;
  }
  if (savedInterest > 0) return `saves ${formatCurrencyWhole(savedInterest)}`;
  if (savedMonths > 0) return `${formatMonths(savedMonths)} sooner`;
  return 'no change';
}
