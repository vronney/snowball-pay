import type { MilestoneTier } from '@/lib/milestoneDetection';

/**
 * Computes the server-side highlight stat shown below the celebration message.
 * Pure function — no DB access, no side effects.
 *
 * Arm 1 (schedule acceleration): monthsSaved >= 1
 * Arm 2 (debt-specific milestones): first_payment | debt_paid_off
 * Arm 3 (portfolio milestones): quarter_paid | half_paid | three_quarter | streak_six_months | anniversary
 * Arm 4 (fallback): routine payment or missing data
 */
export function computeHighlightStat(args: {
  tier: MilestoneTier;
  monthsSaved?: number;
  pctThisDebt: number;
  pctAllDebts: number;
  debtName: string;
}): string {
  const { tier, monthsSaved, pctThisDebt, pctAllDebts, debtName } = args;

  // Arm 1: ahead of schedule
  if (monthsSaved != null && monthsSaved >= 1) {
    return `${monthsSaved} month${monthsSaved !== 1 ? 's' : ''} ahead of original schedule`;
  }

  // Arm 2: debt-specific milestones
  if (tier === 'first_payment' || tier === 'debt_paid_off') {
    return `${Math.round(pctThisDebt)}% of ${debtName} paid`;
  }

  // Arm 3: portfolio milestones
  if (
    tier === 'quarter_paid' ||
    tier === 'half_paid' ||
    tier === 'three_quarter' ||
    tier === 'streak_six_months' ||
    tier === 'anniversary'
  ) {
    return `${Math.round(pctAllDebts)}% of total debt paid`;
  }

  // Arm 4: fallback — routine payment or any missing/stale data
  return `${Math.round(pctThisDebt)}% of ${debtName} paid`;
}
