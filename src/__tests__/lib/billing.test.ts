import { describe, expect, it } from 'vitest';
import {
  SIGNUP_TRIAL_DAYS,
  SIGNUP_TRIAL_LAUNCH,
  POST_TRIAL_PROMPT_DAYS,
  signupTrialEndsAt,
  isSignupTrialActive,
  isInPostTrialPromptWindow,
  signupTrialDaysRemaining,
} from '@/lib/billing';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('signup trial window', () => {
  it('ends SIGNUP_TRIAL_DAYS after account creation', () => {
    const createdAt = new Date(SIGNUP_TRIAL_LAUNCH.getTime() + DAY_MS);
    expect(signupTrialEndsAt(createdAt)?.getTime()).toBe(
      createdAt.getTime() + SIGNUP_TRIAL_DAYS * DAY_MS,
    );
  });

  it('gives accounts predating the launch no window at all', () => {
    const preLaunch = new Date(SIGNUP_TRIAL_LAUNCH.getTime() - 1);
    expect(signupTrialEndsAt(preLaunch)).toBeNull();
    expect(isSignupTrialActive(preLaunch)).toBe(false);
    expect(signupTrialDaysRemaining(preLaunch)).toBe(0);
  });

  it('counts whole remaining days, never negative', () => {
    const now = Date.now();
    const oneDayIn = new Date(now - DAY_MS);
    // Guard: only meaningful once "1 day ago" is past the launch date.
    if (oneDayIn.getTime() >= SIGNUP_TRIAL_LAUNCH.getTime()) {
      expect(signupTrialDaysRemaining(oneDayIn, now)).toBe(SIGNUP_TRIAL_DAYS - 1);
    }
    const longAgo = new Date(SIGNUP_TRIAL_LAUNCH.getTime() + DAY_MS);
    expect(signupTrialDaysRemaining(longAgo, longAgo.getTime() + 30 * DAY_MS)).toBe(0);
  });

  it('prompt window covers only the days right after the week ends', () => {
    const end = Date.now() - 1000;
    expect(isInPostTrialPromptWindow(new Date(end))).toBe(true);
    expect(isInPostTrialPromptWindow(new Date(Date.now() + DAY_MS))).toBe(false); // not ended yet
    expect(
      isInPostTrialPromptWindow(new Date(Date.now() - (POST_TRIAL_PROMPT_DAYS + 1) * DAY_MS)),
    ).toBe(false); // too long ago
  });
});
