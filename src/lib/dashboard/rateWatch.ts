import type { Debt } from '@/types';
import { isActiveDebt } from '@/lib/monthlyFocusDebt';
import {
  computeRateTargets,
  estimateAnnualSavingsExact,
  isNegotiableCard,
} from '@/lib/apr-negotiation/apr-negotiation-adapter';
import type { RateOpportunity, RateWatch } from './types';

/**
 * Estimated yearly interest recoverable if each active credit card drops to
 * its APR-negotiation target (≈30% lower, floor 9.99%). Same formula as the
 * APR card, but unrounded here (each card's `annualEstimate` and their sum),
 * floored only for display — so the total may read $1 under the APR card,
 * which rounds its own single-card estimate.
 */
export function computeRateWatch(
  debts: ReadonlyArray<Pick<Debt, 'id' | 'name' | 'category' | 'balance' | 'interestRate'>>,
): RateWatch | null {
  const opportunities: RateOpportunity[] = debts
    .filter((d) => isActiveDebt(d) && isNegotiableCard(d))
    .map((d) => {
      const targetApr = Number(computeRateTargets(d.interestRate).targetApr);
      return {
        debtId: d.id,
        debtName: d.name,
        apr: d.interestRate,
        targetApr,
        annualEstimate: estimateAnnualSavingsExact(d.balance, d.interestRate, targetApr) ?? 0,
      };
    })
    .filter((o) => o.annualEstimate > 0)
    // top = highest APR, matching the APR-negotiation card's default card (not necessarily the largest $ saving).
    .sort((a, b) => b.apr - a.apr);

  if (opportunities.length === 0) return null;
  return {
    cards: opportunities.length,
    annualEstimate: opportunities.reduce((sum, o) => sum + o.annualEstimate, 0),
    top: opportunities[0],
  };
}
