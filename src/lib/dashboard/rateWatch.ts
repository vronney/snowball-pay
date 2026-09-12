import type { Debt } from '@/types';
import { isActiveDebt } from '@/lib/monthlyFocusDebt';
import {
  computeRateTargets,
  estimateAnnualSavings,
  isNegotiableCard,
} from '@/lib/apr-negotiation/apr-negotiation-adapter';
import type { RateOpportunity, RateWatch } from './types';

/**
 * Estimated yearly interest recoverable if each active credit card drops to
 * its APR-negotiation target (≈30% lower, floor 9.99%). The same estimate the
 * APR card shows, so it is labelled "est." wherever it appears.
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
        annualEstimate: estimateAnnualSavings(d.balance, d.interestRate, targetApr) ?? 0,
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
