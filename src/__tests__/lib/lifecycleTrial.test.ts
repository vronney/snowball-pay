import { describe, expect, it } from 'vitest';
import {
  TRIAL_ENDED_CHECK_KEY,
  TRIAL_ENDING_CHECK_KEY,
  daysSinceTrialEnd,
  daysUntilTrialEnd,
  hasReceivedTrialEmail,
  pickTrialEmail,
  trialCandidateCreatedAfter,
  trialCheckKey,
  trialGrantSentField,
} from '@/lib/lifecycleTrial';
import { POST_TRIAL_PROMPT_DAYS } from '@/lib/billing';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-09-04T10:30:00Z');
const endsIn = (days: number) => new Date(now.getTime() + days * DAY);

describe('pickTrialEmail', () => {
  it('is null while the trial has more than 4 days left', () => {
    expect(pickTrialEmail(endsIn(10), now)).toBeNull();
    expect(pickTrialEmail(endsIn(4.5), now)).toBeNull();
  });

  it('is "ending" 2 to 4 days before the window closes', () => {
    expect(pickTrialEmail(endsIn(4), now)).toBe('ending');
    expect(pickTrialEmail(endsIn(3), now)).toBe('ending');
    expect(pickTrialEmail(endsIn(2), now)).toBe('ending');
  });

  it('is null in the last two days (the in-app urgent banner owns that)', () => {
    expect(pickTrialEmail(endsIn(1.5), now)).toBeNull();
    expect(pickTrialEmail(endsIn(0.1), now)).toBeNull();
  });

  it('is "ended" from the boundary through the post-trial prompt window', () => {
    expect(pickTrialEmail(endsIn(0), now)).toBe('ended');
    expect(pickTrialEmail(endsIn(-1), now)).toBe('ended');
    expect(pickTrialEmail(endsIn(-(POST_TRIAL_PROMPT_DAYS - 0.5)), now)).toBe('ended');
  });

  it('is null once the post-trial prompt window has passed', () => {
    expect(pickTrialEmail(endsIn(-POST_TRIAL_PROMPT_DAYS), now)).toBeNull();
    expect(pickTrialEmail(endsIn(-30), now)).toBeNull();
  });
});

describe('check keys and dedupe', () => {
  it('maps each kind to its own key and grant column', () => {
    expect(trialCheckKey('ending')).toBe(TRIAL_ENDING_CHECK_KEY);
    expect(trialCheckKey('ended')).toBe(TRIAL_ENDED_CHECK_KEY);
    expect(TRIAL_ENDING_CHECK_KEY).not.toBe(TRIAL_ENDED_CHECK_KEY);
    expect(trialGrantSentField('ending')).toBe('endingEmailSentAt');
    expect(trialGrantSentField('ended')).toBe('endedEmailSentAt');
  });

  it('reads the flag only from a plain object', () => {
    expect(hasReceivedTrialEmail({ [TRIAL_ENDING_CHECK_KEY]: true }, 'ending')).toBe(true);
    expect(hasReceivedTrialEmail({ [TRIAL_ENDING_CHECK_KEY]: true }, 'ended')).toBe(false);
    expect(hasReceivedTrialEmail(null, 'ending')).toBe(false);
    expect(hasReceivedTrialEmail([], 'ending')).toBe(false);
    expect(hasReceivedTrialEmail('x', 'ending')).toBe(false);
  });
});

describe('window helpers', () => {
  it('bounds candidates to accounts that can still be inside a window', () => {
    const after = trialCandidateCreatedAfter(now);
    expect(now.getTime() - after.getTime()).toBe((14 + POST_TRIAL_PROMPT_DAYS) * DAY);
  });

  it('counts whole days left, never negative', () => {
    expect(daysUntilTrialEnd(endsIn(2.2), now)).toBe(3);
    expect(daysUntilTrialEnd(endsIn(2), now)).toBe(2);
    expect(daysUntilTrialEnd(endsIn(-1), now)).toBe(0);
  });

  it('counts whole days since the end, zero on the boundary day', () => {
    expect(daysSinceTrialEnd(endsIn(-0.5), now)).toBe(0);
    expect(daysSinceTrialEnd(endsIn(-1), now)).toBe(1);
    expect(daysSinceTrialEnd(endsIn(-2.5), now)).toBe(2);
    expect(daysSinceTrialEnd(endsIn(3), now)).toBe(0);
  });
});
