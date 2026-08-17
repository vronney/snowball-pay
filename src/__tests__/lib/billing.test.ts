import { describe, expect, it } from 'vitest';
import {
  SIGNUP_TRIAL_DAYS,
  SIGNUP_TRIAL_LAUNCH,
  POST_TRIAL_PROMPT_DAYS,
  signupTrialEndsAt,
  isSignupTrialActive,
  isInPostTrialPromptWindow,
  wholeDaysRemaining,
  normalizeTrialEmail,
} from '@/lib/billing';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('signup trial window', () => {
  it('ends SIGNUP_TRIAL_DAYS after the anchor', () => {
    const anchor = new Date(SIGNUP_TRIAL_LAUNCH.getTime() + DAY_MS);
    expect(signupTrialEndsAt(anchor)?.getTime()).toBe(
      anchor.getTime() + SIGNUP_TRIAL_DAYS * DAY_MS,
    );
  });

  it('gives anchors predating the launch no window at all', () => {
    const preLaunch = new Date(SIGNUP_TRIAL_LAUNCH.getTime() - 1);
    expect(signupTrialEndsAt(preLaunch)).toBeNull();
    expect(isSignupTrialActive(preLaunch)).toBe(false);
  });

  it('counts whole remaining days, never negative', () => {
    const anchor = new Date(SIGNUP_TRIAL_LAUNCH.getTime() + DAY_MS);
    const end = signupTrialEndsAt(anchor)!;
    expect(wholeDaysRemaining(end, end.getTime() - 2.5 * DAY_MS)).toBe(3);
    expect(wholeDaysRemaining(end, end.getTime() - SIGNUP_TRIAL_DAYS * DAY_MS)).toBe(
      SIGNUP_TRIAL_DAYS,
    );
    expect(wholeDaysRemaining(end, end.getTime() + 30 * DAY_MS)).toBe(0);
  });

  it('prompt window covers only the days right after the trial ends', () => {
    const end = Date.now() - 1000;
    expect(isInPostTrialPromptWindow(new Date(end))).toBe(true);
    expect(isInPostTrialPromptWindow(new Date(Date.now() + DAY_MS))).toBe(false); // not ended yet
    expect(
      isInPostTrialPromptWindow(new Date(Date.now() - (POST_TRIAL_PROMPT_DAYS + 1) * DAY_MS)),
    ).toBe(false); // too long ago
  });

  it('normalizes trial-grant emails to one canonical key', () => {
    expect(normalizeTrialEmail('  Person@Example.COM ')).toBe('person@example.com');
  });
});
