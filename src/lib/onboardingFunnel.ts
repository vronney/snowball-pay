export const ONBOARDING_DRAFT_VERSION = 2;

export const ONBOARDING_STEPS = [
  'monthly_capacity',
  'payoff_strategy',
  'first_debt',
] as const;

/**
 * The original four-step wizard started with an unused goal question.
 * Map its saved step indexes into the shorter three-step flow so an existing
 * browser draft resumes at the same meaningful task instead of jumping ahead.
 */
export function normaliseOnboardingStep(
  savedStep: unknown,
  draftVersion: unknown,
): number {
  if (typeof savedStep !== 'number' || !Number.isInteger(savedStep)) return 0;

  if (draftVersion === ONBOARDING_DRAFT_VERSION) {
    return Math.max(0, Math.min(savedStep, ONBOARDING_STEPS.length - 1));
  }

  if (savedStep <= 1) return 0;
  if (savedStep === 2) return 1;
  return 2;
}
