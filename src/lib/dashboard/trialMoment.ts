import { SIGNUP_TRIAL_DAYS, isInPostTrialPromptWindow, wholeDaysRemaining } from '@/lib/billing';
import { floorDollars } from './format';
import type { TierInfo, TrialMoment } from './types';

/**
 * The trial's baseline (spec §6.4) and the inline upgrade moment it feeds
 * (spec §7). Pure: the insights route and the trial start supply the rows.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Moments B and C each cover this many days at one end of the trial. */
export const TRIAL_MOMENT_WINDOW_DAYS = 3;

export interface TrialBaseline {
  /** The client-local day it was taken, as UTC midnight (baselineDay). */
  at: Date;
  months: number;
  interest: number;
}

export interface TrialBaselineFields {
  trialBaselineAt: Date;
  trialBaselineMonths: number;
  trialBaselineInterest: number;
}

/**
 * The client's calendar day as that day's UTC midnight. Read back with
 * getUTC*, it names the same month on any server, so moment C's month
 * comparison can't slip across a time zone.
 */
export function baselineDay(today: Date): Date {
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
}

interface BaselinePlan { months: number; totalInterest: number }

/**
 * The UserPreferences columns for a baseline taken from `plan` today, or none
 * without a plan that pays off (a capped run is not a plan, isPayoffComplete).
 */
export function trialBaselineFields(plan: BaselinePlan, today: Date): TrialBaselineFields;
export function trialBaselineFields(plan: BaselinePlan | null, today: Date): TrialBaselineFields | Record<string, never>;
export function trialBaselineFields(
  plan: BaselinePlan | null,
  today: Date,
): TrialBaselineFields | Record<string, never> {
  if (!plan) return {};
  return {
    trialBaselineAt: baselineDay(today),
    trialBaselineMonths: plan.months,
    trialBaselineInterest: plan.totalInterest,
  };
}

/** The stored baseline, or null unless all three columns are set. */
export function storedTrialBaseline(
  row: { trialBaselineAt: Date | null; trialBaselineMonths: number | null; trialBaselineInterest: number | null } | null,
): TrialBaseline | null {
  if (!row || row.trialBaselineAt === null || row.trialBaselineMonths === null || row.trialBaselineInterest === null) {
    return null;
  }
  return { at: row.trialBaselineAt, months: row.trialBaselineMonths, interest: row.trialBaselineInterest };
}

/** Every trial, signup or self-serve, is SIGNUP_TRIAL_DAYS long. */
export function trialStartOf(endsAt: Date): Date {
  return new Date(endsAt.getTime() - SIGNUP_TRIAL_DAYS * DAY_MS);
}

export interface TrialMomentInput {
  tier: TierInfo;
  /** The server clock: a trial's days are billing time. */
  now: Date;
  /** The client's local day: debt-free months are counted from it. */
  today: Date;
  /** The plan the dashboard shows (insights `plan`), or null when it doesn't pay off. */
  plan: { months: number; totalInterest: number } | null;
  baseline: TrialBaseline | null;
  /** Payment records logged since the trial started; null outside moment C. */
  paymentsSinceStart: number | null;
}

/** At most one inline moment (spec §7): B, C or D, or null. */
export function computeTrialMoment(input: TrialMomentInput): TrialMoment | null {
  const { tier, now } = input;
  if (tier.paidPro || tier.trial.endsAt === null) return null;
  const endsAt = new Date(tier.trial.endsAt);
  if (Number.isNaN(endsAt.getTime())) return null;

  if (tier.trial.active) {
    const elapsedDays = Math.max(0, Math.floor((now.getTime() - trialStartOf(endsAt).getTime()) / DAY_MS));
    const daysLeft = wholeDaysRemaining(endsAt, now.getTime());
    if (elapsedDays + 1 <= TRIAL_MOMENT_WINDOW_DAYS) return { state: 'B', day: elapsedDays + 1, daysLeft };
    if (daysLeft > TRIAL_MOMENT_WINDOW_DAYS) return null;
    const payments = input.paymentsSinceStart;
    return {
      state: 'C',
      daysLeft,
      elapsedDays,
      monthsSooner: monthsSooner(input),
      interestLess: interestLess(input),
      paymentsLogged: payments !== null && payments >= 1 ? payments : null,
    };
  }

  if (!tier.proEligible && isInPostTrialPromptWindow(endsAt, now.getTime())) {
    return { state: 'D', endedAt: tier.trial.endsAt };
  }
  return null;
}

/**
 * How many months earlier the debt-free month is now than at the baseline:
 * (baseline month + its plan months) − (this month + today's plan months).
 * Comparing months, not plan lengths, keeps a month simply passing from
 * reading as "sooner".
 */
function monthsSooner({ plan, baseline, today }: TrialMomentInput): number | null {
  if (!plan || !baseline) return null;
  const before = baseline.at.getUTCFullYear() * 12 + baseline.at.getUTCMonth() + baseline.months;
  const after = today.getFullYear() * 12 + today.getMonth() + plan.months;
  const sooner = before - after;
  return sooner >= 1 ? sooner : null;
}

/** Baseline projected interest minus today's, unrounded; null unless it floors to at least $1. */
function interestLess({ plan, baseline }: TrialMomentInput): number | null {
  if (!plan || !baseline) return null;
  const less = baseline.interest - plan.totalInterest;
  return floorDollars(less) >= 1 ? less : null;
}
