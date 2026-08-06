'use client';

import { formatCurrencyWhole, formatMonths } from '@/lib/utils';
import { cardSurface, color } from '@/lib/designTokens';

interface StrategyComparisonProps {
  /** Label for the plan the user is actually on ("Snowball" / "Avalanche"). */
  strategyName: string;
  /** Label for the method being compared against. */
  comparisonName: string;
  currentMonths: number;
  currentInterest: number;
  comparisonMonths: number;
  comparisonInterest: number;
}

/**
 * Side-by-side readout of the user's plan against the other ordering method.
 *
 * The app already computed both numbers to draw the chart's comparison line —
 * this states them, so choosing a strategy stops being a blind toggle. Both
 * figures must come from the same balance basis (see PayoffTab); comparing a
 * current-balance plan against a creation-balance one would overstate the gap.
 *
 * Durations render as months via formatMonths rather than calendar dates:
 * a locally-built Date formatted during render mismatches between server and
 * client timezones near month boundaries (the countdown hero carries a
 * UTC-then-swap dance for exactly that reason). Months sidestep it entirely.
 */
export default function StrategyComparison({
  strategyName,
  comparisonName,
  currentMonths,
  currentInterest,
  comparisonMonths,
  comparisonInterest,
}: StrategyComparisonProps) {
  // Round before comparing: sub-dollar and sub-month differences are noise
  // from the amortization loop, not a real trade-off worth naming.
  const interestGap = Math.round(currentInterest) - Math.round(comparisonInterest);
  const monthsGap = currentMonths - comparisonMonths;
  const comparisonIsCheaper = interestGap > 0;
  const identical = interestGap === 0 && monthsGap === 0;

  const rows = [
    {
      label: `Your plan (${strategyName})`,
      months: currentMonths,
      interest: currentInterest,
      active: true,
    },
    {
      label: `${comparisonName} plan`,
      months: comparisonMonths,
      interest: comparisonInterest,
      active: false,
    },
  ];

  let verdict: string;
  if (identical) {
    verdict = `Both methods finish on the same date for the same interest — with your balances and rates, the payoff order works out identical either way.`;
  } else if (comparisonIsCheaper) {
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
    verdict = `${comparisonName} costs ${formatCurrencyWhole(interestGap)} less interest${monthsClause}.${tradeOff} Switch above and the whole plan recalculates.`;
  } else {
    verdict = `Your ${strategyName.toLowerCase()} plan costs ${formatCurrencyWhole(-interestGap)} less interest than ${comparisonName.toLowerCase()} would. You're on the cheaper of the two.`;
  }

  return (
    <div style={{ ...cardSurface, padding: '20px' }}>
      <div className="eyebrow" style={{ marginBottom: '12px' }}>
        Strategy comparison
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: row.active ? color.tint : '#f8fafc',
              border: `1px solid ${row.active ? color.tintBorder : 'rgba(15,23,42,0.08)'}`,
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: row.active ? color.primary : color.muted,
                marginBottom: '6px',
              }}
            >
              {row.label}
            </div>
            <div
              className="mono"
              style={{
                fontSize: '17px',
                fontWeight: 800,
                color: color.text,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatMonths(row.months)}
            </div>
            <div
              className="mono"
              style={{
                fontSize: '12px',
                color: color.faint,
                marginTop: '2px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatCurrencyWhole(row.interest)} interest
            </div>
          </div>
        ))}
      </div>

      <p
        style={{
          fontSize: '12px',
          lineHeight: 1.6,
          color: color.muted,
          margin: '12px 0 0',
        }}
      >
        {verdict}
      </p>
    </div>
  );
}
