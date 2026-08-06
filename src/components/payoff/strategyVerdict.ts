import { formatCurrencyWhole, formatMonths } from '@/lib/utils';

interface StrategyVerdictInput {
  strategyName: string;
  comparisonName: string;
  currentMonths: number;
  currentInterest: number;
  comparisonMonths: number;
  comparisonInterest: number;
}

/**
 * The sentence under the strategy comparison.
 *
 * Extracted from the component so every branch is reachable in tests: the
 * interest tie below shipped as a fall-through that told users their plan cost
 * "$0 less interest" and was "the cheaper of the two", which was both nonsense
 * and an unsupported claim.
 *
 * The rule: never assert one plan is cheaper unless the rounded totals actually
 * differ. Interest and duration are separate axes and a tie on one says nothing
 * about the other.
 */
export function strategyVerdict({
  strategyName,
  comparisonName,
  currentMonths,
  currentInterest,
  comparisonMonths,
  comparisonInterest,
}: StrategyVerdictInput): string {
  // Round before comparing: sub-dollar differences are noise from the
  // amortization loop, not a trade-off worth naming.
  const interestGap =
    Math.round(currentInterest) - Math.round(comparisonInterest);
  const monthsGap = currentMonths - comparisonMonths;

  // Tied on interest — describe the timing, claim nothing about cost.
  if (interestGap === 0) {
    if (monthsGap === 0) {
      return `Both methods finish on the same date for the same interest — with your balances and rates, the payoff order works out identical either way.`;
    }
    if (monthsGap > 0) {
      return `${comparisonName} finishes ${formatMonths(monthsGap)} sooner for the same interest. Switch above and the whole plan recalculates.`;
    }
    return `Your ${strategyName.toLowerCase()} plan finishes ${formatMonths(-monthsGap)} sooner than ${comparisonName.toLowerCase()}, for the same interest.`;
  }

  if (interestGap > 0) {
    const monthsClause =
      monthsGap > 0
        ? ` and finishes ${formatMonths(monthsGap)} sooner`
        : monthsGap < 0
          ? ` but takes ${formatMonths(-monthsGap)} longer`
          : '';
    // Only Snowball has a non-financial rationale to name; when the user is on
    // Avalanche and something else is cheaper, state the number and stop.
    const tradeOff =
      strategyName === 'Snowball'
        ? ` ${strategyName} trades that for clearing your smallest balance first, which is why it's the default.`
        : '';
    return `${comparisonName} costs ${formatCurrencyWhole(interestGap)} less interest${monthsClause}.${tradeOff} Switch above and the whole plan recalculates.`;
  }

  return `Your ${strategyName.toLowerCase()} plan costs ${formatCurrencyWhole(-interestGap)} less interest than ${comparisonName.toLowerCase()} would. You're on the cheaper of the two.`;
}
