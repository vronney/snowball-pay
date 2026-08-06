import { describe, expect, it } from 'vitest';
import { strategyVerdict } from '@/components/payoff/strategyVerdict';

/**
 * The verdict sentence sits under two columns of real money. It must never
 * assert one plan is cheaper unless the rounded totals actually differ —
 * interest and duration are separate axes, and a tie on one says nothing about
 * the other.
 */

const base = {
  strategyName: 'Snowball',
  comparisonName: 'Avalanche',
  currentMonths: 48,
  currentInterest: 5000,
  comparisonMonths: 48,
  comparisonInterest: 5000,
};

describe('strategyVerdict — interest ties', () => {
  it('calls a full tie identical', () => {
    expect(strategyVerdict(base)).toContain('same date for the same interest');
  });

  it('reports the comparison finishing sooner without claiming it is cheaper', () => {
    // Regression: this combination used to fall through to the "cheaper"
    // branch and render "costs $0 less interest ... you're on the cheaper of
    // the two" — nonsense, and wrong about which plan wins.
    const v = strategyVerdict({ ...base, comparisonMonths: 42 });
    expect(v).toBe(
      'Avalanche finishes 6m sooner for the same interest. Switch above and the whole plan recalculates.',
    );
    expect(v).not.toContain('$0');
    expect(v).not.toContain('cheaper');
  });

  it('reports the current plan finishing sooner without claiming it is cheaper', () => {
    const v = strategyVerdict({ ...base, comparisonMonths: 54 });
    expect(v).toBe(
      'Your snowball plan finishes 6m sooner than avalanche, for the same interest.',
    );
    expect(v).not.toContain('$0');
    expect(v).not.toContain('cheaper');
  });

  it('treats a sub-dollar difference as a tie, not a saving', () => {
    // Both round to $5,000, so there is no trade-off worth naming.
    const v = strategyVerdict({
      ...base,
      currentInterest: 5000.4,
      comparisonInterest: 4999.6,
    });
    expect(v).toContain('same date for the same interest');
    expect(v).not.toContain('cheaper');
  });
});

describe('strategyVerdict — a real gap', () => {
  it('names the comparison when it is cheaper and faster', () => {
    const v = strategyVerdict({
      ...base,
      comparisonInterest: 4250,
      comparisonMonths: 44,
    });
    expect(v).toContain('Avalanche costs $750 less interest');
    expect(v).toContain('finishes 4m sooner');
  });

  it('says so when the cheaper plan is also slower', () => {
    const v = strategyVerdict({
      ...base,
      comparisonInterest: 4250,
      comparisonMonths: 52,
    });
    expect(v).toContain('costs $750 less interest');
    expect(v).toContain('takes 4m longer');
  });

  it('names the snowball trade-off only when the user is on snowball', () => {
    const onSnowball = strategyVerdict({ ...base, comparisonInterest: 4250 });
    expect(onSnowball).toContain('smallest balance first');

    const onAvalanche = strategyVerdict({
      ...base,
      strategyName: 'Avalanche',
      comparisonName: 'Snowball',
      comparisonInterest: 4250,
    });
    expect(onAvalanche).not.toContain('smallest balance first');
  });

  it('credits the current plan when it is the cheaper one', () => {
    const v = strategyVerdict({ ...base, comparisonInterest: 6100 });
    expect(v).toContain('costs $1,100 less interest than avalanche');
    expect(v).toContain("You're on the cheaper of the two");
  });
});
