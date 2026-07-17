import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_DRAFT_VERSION,
  ONBOARDING_STEPS,
  normaliseOnboardingStep,
} from '@/lib/onboardingFunnel';

describe('onboarding funnel', () => {
  it('keeps the direct onboarding path focused on the three plan inputs', () => {
    expect(ONBOARDING_STEPS).toEqual([
      'monthly_capacity',
      'payoff_strategy',
      'first_debt',
    ]);
  });

  it('restores current-version drafts within the three-step bounds', () => {
    expect(normaliseOnboardingStep(0, ONBOARDING_DRAFT_VERSION)).toBe(0);
    expect(normaliseOnboardingStep(2, ONBOARDING_DRAFT_VERSION)).toBe(2);
    expect(normaliseOnboardingStep(99, ONBOARDING_DRAFT_VERSION)).toBe(2);
  });

  it('maps legacy goal, budget, strategy, and debt steps to equivalent work', () => {
    expect(normaliseOnboardingStep(0, undefined)).toBe(0);
    expect(normaliseOnboardingStep(1, undefined)).toBe(0);
    expect(normaliseOnboardingStep(2, undefined)).toBe(1);
    expect(normaliseOnboardingStep(3, undefined)).toBe(2);
  });

  it('falls back to the first useful step for malformed drafts', () => {
    expect(normaliseOnboardingStep('2', ONBOARDING_DRAFT_VERSION)).toBe(0);
    expect(normaliseOnboardingStep(Number.NaN, ONBOARDING_DRAFT_VERSION)).toBe(0);
  });
});
