import { describe, expect, it } from 'vitest';
import {
  accelerationView, anyAmountView, fixAppliedNote, planClosingView, strategyPairView, whatIfFreeTile,
} from '@/lib/dashboard/plan';

const result = (months: number, totalInterestPaid: number) => ({ months, totalInterestPaid });

describe('strategyPairView (spec §8.5 My Plan)', () => {
  it('names the pair, marks the cheaper alternative and carries the verdict', () => {
    const view = strategyPairView({ method: 'snowball', current: result(31, 14_824), alternative: result(30, 13_794) });
    expect(view).toMatchObject({
      yours: { label: 'Yours · Snowball', figure: '$14,824' },
      other: { label: 'Avalanche', figure: '$13,794', cheaper: true },
    });
    expect(view?.caption).toContain('Avalanche costs $1,030 less interest');
  });

  it('says so when the current method is already the cheaper one', () => {
    const view = strategyPairView({ method: 'avalanche', current: result(30, 13_794), alternative: result(31, 14_824) });
    expect(view?.other).toMatchObject({ label: 'Snowball', cheaper: false });
    expect(view?.caption).toBe("Your avalanche plan costs $1,030 less interest than snowball would. You're on the cheaper of the two.");
  });

  it('does not call a sub-dollar difference cheaper', () => {
    const view = strategyPairView({ method: 'snowball', current: result(30, 1000.4), alternative: result(30, 1000.1) });
    expect(view?.other.cheaper).toBe(false);
  });

  it('is null for custom ordering or without an alternative', () => {
    expect(strategyPairView({ method: 'custom', current: result(31, 100), alternative: result(30, 90) })).toBeNull();
    expect(strategyPairView({ method: 'snowball', current: result(31, 100), alternative: null })).toBeNull();
  });
});

describe('accelerationView (README §3b)', () => {
  it('formats the amount in cents with the available maximum', () => {
    expect(accelerationView(500, 2506.61)).toEqual({ value: '$500.00', max: 2506.61, maxLabel: '$2,506.61 available' });
  });

  it('is null without available cash flow', () => {
    expect(accelerationView(0, 0)).toBeNull();
    expect(accelerationView(0, Number.NaN)).toBeNull();
  });
});

describe('whatIfFreeTile (README §3c)', () => {
  it('reads the saving from the engine run', () => {
    expect(whatIfFreeTile(result(31, 14_824), result(29, 14_301))).toEqual({ label: '+$25/mo', result: '2m sooner · saves $523' });
    expect(whatIfFreeTile(result(31, 14_824), result(31, 14_700))?.result).toBe('saves $124');
  });

  it('is null when the rung changes nothing (hide, do not fake)', () => {
    expect(whatIfFreeTile(result(31, 100), result(31, 100))).toBeNull();
  });
});

describe('anyAmountView (Pro; WhatIfCard\'s ladder rules)', () => {
  const current = result(31, 14_824);

  it('is applicable within headroom and clamps the next acceleration like the ladder', () => {
    const view = anyAmountView({ delta: 100, current, withExtra: result(27, 13_900), availableCashFlow: 700, effectiveAcceleration: 500 });
    expect(view).toEqual({ months: '2y 3m', interest: '$13,900 interest', caption: '4m sooner · saves $924', canApply: true, nextAcceleration: 600 });
  });

  it('is inert beyond headroom and says what it would need', () => {
    const view = anyAmountView({ delta: 300, current, withExtra: result(20, 10_000), availableCashFlow: 700, effectiveAcceleration: 500 });
    expect(view?.canApply).toBe(false);
    expect(view?.caption).toBe('needs $100 more room');
  });

  it('is null for a non-positive or non-numeric amount', () => {
    const base = { current, withExtra: current, availableCashFlow: 700, effectiveAcceleration: 500 };
    expect(anyAmountView({ delta: 0, ...base })).toBeNull();
    expect(anyAmountView({ delta: -5, ...base })).toBeNull();
    expect(anyAmountView({ delta: Number.NaN, ...base })).toBeNull();
  });
});

describe('planClosingView (spec §8.4 "Plan closing")', () => {
  const behind = { amount: -2621.46, asOfMonth: 'Sep 2026' };

  it('states the gap in cents and offers the one-tap fix first', () => {
    expect(planClosingView({ planGap: behind, canFix: true, missedCount: 2 })).toEqual({
      eyebrow: 'Plan vs actual',
      figure: '$2,621.46 behind',
      text: 'Balances are $2,621.46 above where the plan expected by Sep 2026.',
      cta: { kind: 'fix', label: 'Fix it in one tap' },
    });
  });

  it('falls back to logging when there is no unused cash flow, and to no CTA', () => {
    expect(planClosingView({ planGap: behind, canFix: false, missedCount: 2 })?.cta).toEqual({ kind: 'log', label: "Log this month's payments" });
    expect(planClosingView({ planGap: behind, canFix: false, missedCount: 0 })?.cta).toBeNull();
  });

  it('is null when ahead, on plan, sub-cent, non-finite or without a gap', () => {
    const args = { canFix: true, missedCount: 0 };
    expect(planClosingView({ planGap: { amount: 500, asOfMonth: 'Sep 2026' }, ...args })).toBeNull();
    expect(planClosingView({ planGap: { amount: 0, asOfMonth: 'Sep 2026' }, ...args })).toBeNull();
    expect(planClosingView({ planGap: { amount: -0.001, asOfMonth: 'Sep 2026' }, ...args })).toBeNull();
    expect(planClosingView({ planGap: { amount: Number.NaN, asOfMonth: 'Sep 2026' }, ...args })).toBeNull();
    expect(planClosingView({ planGap: null, ...args })).toBeNull();
  });
});

describe('fixAppliedNote', () => {
  it('names the new month from the engine date', () => {
    expect(fixAppliedNote(new Date(2029, 3, 14))).toBe('Applied — your plan now ends April 2029.');
  });
});
