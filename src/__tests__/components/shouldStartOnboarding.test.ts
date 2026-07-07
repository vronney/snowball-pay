import { describe, it, expect } from 'vitest';
import { shouldStartOnboarding } from '@/lib/onboardingGate';

describe('shouldStartOnboarding', () => {
  it('starts onboarding for a proven-empty account', () => {
    expect(
      shouldStartOnboarding({ hasIncome: false, debtCount: 0, hadError: false }),
    ).toBe(true);
  });

  it('never starts onboarding when queries errored — 401s are not an empty account', () => {
    // Regression: a signup whose email is already registered under another
    // sign-in method gets 401 on every API call. Redirecting to onboarding
    // strands them in a wizard whose submit can only fail.
    expect(
      shouldStartOnboarding({ hasIncome: false, debtCount: 0, hadError: true }),
    ).toBe(false);
  });

  it('does not start onboarding when data exists', () => {
    expect(
      shouldStartOnboarding({ hasIncome: true, debtCount: 0, hadError: false }),
    ).toBe(false);
    expect(
      shouldStartOnboarding({ hasIncome: false, debtCount: 2, hadError: false }),
    ).toBe(false);
  });
});
