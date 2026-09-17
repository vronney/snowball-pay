import { describe, expect, it } from 'vitest';
import {
  baselineDay, computeTrialMoment, storedTrialBaseline, trialBaselineFields, trialStartOf, type TrialMomentInput,
} from '@/lib/dashboard/trialMoment';
import type { TierInfo } from '@/lib/dashboard/types';

describe('the trial baseline (spec §6.4; plan decision 4)', () => {
  it("stores the client's calendar day as that day's UTC midnight, whatever the hour", () => {
    expect(baselineDay(new Date(2026, 8, 17, 23, 30))).toEqual(new Date(Date.UTC(2026, 8, 17)));
    expect(baselineDay(new Date(2026, 8, 17, 0, 5))).toEqual(new Date(Date.UTC(2026, 8, 17)));
  });

  it('writes nothing without a plan that pays off', () => {
    expect(trialBaselineFields(null, new Date(2026, 8, 17))).toEqual({});
  });

  it("records the plan's months and total interest on that day", () => {
    expect(trialBaselineFields({ months: 31, totalInterest: 5_012.34 }, new Date(2026, 8, 17, 9))).toEqual({
      trialBaselineAt: new Date(Date.UTC(2026, 8, 17)),
      trialBaselineMonths: 31,
      trialBaselineInterest: 5_012.34,
    });
  });
});

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 8, 17, 12, 0);
const TODAY = new Date(2026, 8, 17);

function onTrial(endsAt: Date): TierInfo {
  return { proEligible: true, paidPro: false, trial: { active: true, endsAt: endsAt.toISOString(), eligible: false } };
}
function afterTrial(endsAt: Date): TierInfo {
  return { proEligible: false, paidPro: false, trial: { active: false, endsAt: endsAt.toISOString(), eligible: false } };
}
function input(overrides: Partial<TrialMomentInput> = {}): TrialMomentInput {
  return {
    tier: onTrial(new Date(NOW.getTime() + 3 * DAY)),
    now: NOW,
    today: TODAY,
    plan: { months: 30, totalInterest: 5_000 },
    baseline: null,
    paymentsSinceStart: null,
    ...overrides,
  };
}

describe('trialStartOf and storedTrialBaseline', () => {
  it('starts every trial SIGNUP_TRIAL_DAYS before its end', () => {
    expect(trialStartOf(new Date(2026, 9, 1, 12))).toEqual(new Date(new Date(2026, 9, 1, 12).getTime() - 14 * DAY));
  });

  it('reads a stored baseline only when all three columns are set', () => {
    const at = new Date(Date.UTC(2026, 8, 6));
    expect(storedTrialBaseline({ trialBaselineAt: at, trialBaselineMonths: 32, trialBaselineInterest: 5_600 })).toEqual({ at, months: 32, interest: 5_600 });
    expect(storedTrialBaseline({ trialBaselineAt: at, trialBaselineMonths: null, trialBaselineInterest: 5_600 })).toBeNull();
    expect(storedTrialBaseline({ trialBaselineAt: null, trialBaselineMonths: null, trialBaselineInterest: null })).toBeNull();
    expect(storedTrialBaseline(null)).toBeNull();
  });
});

describe('computeTrialMoment (spec §7; plan decisions 5–7)', () => {
  it('is null for paid Pro, for a never-trialed account, and mid-trial', () => {
    expect(computeTrialMoment(input({ tier: { proEligible: true, paidPro: true, trial: { active: false, endsAt: null, eligible: false } } }))).toBeNull();
    expect(computeTrialMoment(input({ tier: { proEligible: true, paidPro: true, trial: { active: false, endsAt: new Date(NOW.getTime() - 2 * DAY).toISOString(), eligible: false } } }))).toBeNull();
    expect(computeTrialMoment(input({ tier: { proEligible: false, paidPro: false, trial: { active: false, endsAt: null, eligible: true } } }))).toBeNull();
    // Day 4, 11 days left: neither end of the trial.
    expect(computeTrialMoment(input({ tier: onTrial(new Date(NOW.getTime() + 11 * DAY)) }))).toBeNull();
  });

  it('is moment B on trial days 1 to 3', () => {
    expect(computeTrialMoment(input({ tier: onTrial(new Date(NOW.getTime() + 14 * DAY - 60 * 60 * 1000)) })))
      .toEqual({ state: 'B', day: 1, daysLeft: 14 });
    expect(computeTrialMoment(input({ tier: onTrial(new Date(NOW.getTime() + 11 * DAY + 60 * 60 * 1000)) })))
      .toEqual({ state: 'B', day: 3, daysLeft: 12 });
  });

  it('is moment C with 3 or fewer days left, and not with 4', () => {
    expect(computeTrialMoment(input({ tier: onTrial(new Date(NOW.getTime() + 3 * DAY)) })))
      .toEqual({ state: 'C', daysLeft: 3, elapsedDays: 11, monthsSooner: null, interestLess: null, paymentsLogged: null });
    expect(computeTrialMoment(input({ tier: onTrial(new Date(NOW.getTime() + 3 * DAY + 60 * 60 * 1000)) }))).toBeNull();
  });

  it("fills moment C's rows from the baseline, the plan today and the payments logged", () => {
    const moment = computeTrialMoment(input({
      baseline: { at: baselineDay(new Date(2026, 8, 6)), months: 32, interest: 5_600.4 },
      paymentsSinceStart: 4,
    }));
    expect(moment).toMatchObject({ state: 'C', monthsSooner: 2, paymentsLogged: 4 });
    expect(moment?.state === 'C' && moment.interestLess).toBeCloseTo(600.4, 6);
  });

  it('never calls a month simply passing "sooner": it compares debt-free months, not plan lengths', () => {
    // Baseline on Aug 31 with 31 months left ends in the same month as Sep 17 with 30 months left.
    expect(computeTrialMoment(input({
      baseline: { at: baselineDay(new Date(2026, 7, 31)), months: 31, interest: 5_000 },
    }))).toMatchObject({ monthsSooner: null, interestLess: null });
  });

  it('hides a row under its threshold: under $1 less, no payments, no plan', () => {
    expect(computeTrialMoment(input({
      baseline: { at: baselineDay(new Date(2026, 8, 6)), months: 30, interest: 5_000.99 },
      paymentsSinceStart: 0,
    }))).toMatchObject({ monthsSooner: null, interestLess: null, paymentsLogged: null });
    expect(computeTrialMoment(input({
      plan: null,
      baseline: { at: baselineDay(new Date(2026, 8, 6)), months: 32, interest: 5_600 },
    }))).toMatchObject({ monthsSooner: null, interestLess: null });
  });

  it('is moment D for 7 days after the trial ends, for an account that is not paying', () => {
    const endedAt = new Date(NOW.getTime() - 2 * DAY);
    expect(computeTrialMoment(input({ tier: afterTrial(endedAt) }))).toEqual({ state: 'D', endedAt: endedAt.toISOString() });
    expect(computeTrialMoment(input({ tier: afterTrial(new Date(NOW.getTime() - 8 * DAY)) }))).toBeNull();
  });
});
