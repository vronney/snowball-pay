/**
 * The self-serve and signup trial's baseline (spec §6.4). Task 3 adds the
 * moment computation to this module.
 */

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
