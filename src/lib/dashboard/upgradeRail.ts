import { formatCurrencyWhole } from '@/lib/utils';
import { summarizeMoveValues } from './coachMoves';
import type { CoachMove, TierInfo } from './types';

export interface UpgradeRailSummary {
  /** Coach moves a Free user can read but not open in full. */
  count: number;
  /** Floor of those moves' per-year estimates; null under $1. Other units are never added in (X7). */
  perYear: number | null;
}

/**
 * The sidebar upgrade rail (README §6 "Sidebar foot"). Shown only to Free users
 * who have at least one gated move, so it never advertises an empty "0 moves".
 */
export function computeUpgradeRail(
  insights: { tier: Pick<TierInfo, 'proEligible'>; coachMoves: ReadonlyArray<CoachMove> } | null | undefined,
): UpgradeRailSummary | null {
  if (!insights || insights.tier.proEligible) return null;
  const gated = insights.coachMoves.filter((move) => !move.isFree);
  if (gated.length === 0) return null;
  const perYear = Math.floor(summarizeMoveValues(gated).perYear);
  return { count: gated.length, perYear: perYear >= 1 ? perYear : null };
}

export function upgradeRailCopy(rail: UpgradeRailSummary): { title: string; value: string | null; cta: string } {
  return {
    title: rail.count === 1 ? '1 move waiting' : `${rail.count} moves waiting`,
    value: rail.perYear === null ? null : `${formatCurrencyWhole(rail.perYear)}/yr est.`,
    cta: rail.count === 1 ? 'Unlock the move' : `Unlock all ${rail.count}`,
  };
}
