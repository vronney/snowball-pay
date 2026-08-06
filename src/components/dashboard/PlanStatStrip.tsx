'use client';

import { formatCurrencyWhole } from '@/lib/utils';
import { cardSurface, color } from '@/lib/designTokens';

interface PlanStatStripProps {
  /** Sum of current balances across all debts. */
  totalDebt: number;
  debtCount: number;
  monthlyTakeHome: number;
  /** Minimums across all active debts. */
  totalMinPayments: number;
  /** Extra going toward the plan on top of minimums. */
  acceleration: number;
  /** Total interest the current plan is projected to pay. */
  projectedInterest: number;
}

/**
 * The raw current numbers, as one hairline-segmented strip.
 *
 * Deliberately disjoint from the countdown hero: the hero answers "how does
 * this plan compare to doing nothing" (interest reclaimed, months saved,
 * progress), this answers "what are the numbers right now". Nothing appears in
 * both — projected interest here is the plan's total cost, where the hero
 * shows the amount *saved* against minimums-only.
 *
 * Acceleration and interest-saved are sublines rather than tiles of their own;
 * they qualify the number above them and don't stand alone.
 */
export default function PlanStatStrip({
  totalDebt,
  debtCount,
  monthlyTakeHome,
  totalMinPayments,
  acceleration,
  projectedInterest,
}: PlanStatStripProps) {
  const monthlyPayment = totalMinPayments + acceleration;

  const stats = [
    {
      label: 'Total remaining',
      value: formatCurrencyWhole(totalDebt),
      sub: `across ${debtCount} debt${debtCount !== 1 ? 's' : ''}`,
    },
    {
      label: 'Monthly income',
      value: formatCurrencyWhole(monthlyTakeHome),
      sub: 'take-home',
    },
    {
      label: 'Monthly payment',
      value: formatCurrencyWhole(monthlyPayment),
      sub:
        acceleration > 0
          ? `${formatCurrencyWhole(totalMinPayments)} min + ${formatCurrencyWhole(acceleration)} extra`
          : 'minimums only',
    },
    {
      label: 'Projected interest',
      value: formatCurrencyWhole(projectedInterest),
      sub: 'on your current plan',
    },
  ];

  return (
    // Two-up on small screens before four-up at md: four cents-free mono values
    // still crowd below ~700px, and the same overflow bit the monthly snapshot
    // when its container narrowed.
    <div className="grid grid-cols-2 md:grid-cols-4" style={cardSurface}>
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={[
            // Column rule between pairs on the 2-up grid, between every tile on
            // the 4-up one. Row rule only where a second row exists (2-up).
            i % 2 === 1 ? 'border-l' : '',
            i >= 2 ? 'border-t md:border-t-0' : '',
            'md:border-l',
            i === 0 ? 'md:border-l-0' : '',
          ].join(' ')}
          style={{ padding: '14px 16px', borderColor: 'rgba(15,23,42,0.07)' }}
        >
          <div className="eyebrow" style={{ marginBottom: '3px' }}>
            {stat.label}
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
            {stat.value}
          </div>
          <div style={{ fontSize: '11px', color: color.faint, marginTop: '2px' }}>
            {stat.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
