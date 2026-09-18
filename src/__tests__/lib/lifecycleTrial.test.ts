import { describe, expect, it } from 'vitest';
import {
  TRIAL_ENDED_CHECK_KEY,
  TRIAL_ENDING_CHECK_KEY,
  TRIAL_STOPPED_CHECK_KEY,
  TRIAL_STOPPED_MIN_DAYS,
  daysSinceTrialEnd,
  daysUntilTrialEnd,
  dueTrialEmails,
  hasReceivedTrialEmail,
  trialCandidateCreatedAfter,
  trialCheckKey,
  trialGrantSentField,
} from '@/lib/lifecycleTrial';
import { POST_TRIAL_PROMPT_DAYS } from '@/lib/billing';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-09-04T10:30:00Z');
const endsIn = (days: number) => new Date(now.getTime() + days * DAY);

describe('dueTrialEmails', () => {
  it('is empty while the trial has more than 4 days left', () => {
    expect(dueTrialEmails(endsIn(10), now)).toEqual([]);
    expect(dueTrialEmails(endsIn(4.5), now)).toEqual([]);
  });

  it('is "ending" 2 to 4 days before the window closes', () => {
    expect(dueTrialEmails(endsIn(4), now)).toEqual(['ending']);
    expect(dueTrialEmails(endsIn(3), now)).toEqual(['ending']);
    expect(dueTrialEmails(endsIn(2), now)).toEqual(['ending']);
  });

  it('is empty in the last two days (the in-app urgent banner owns that)', () => {
    expect(dueTrialEmails(endsIn(1.5), now)).toEqual([]);
    expect(dueTrialEmails(endsIn(0.1), now)).toEqual([]);
  });

  it('is "ended" alone from the boundary until the stopped ask is due', () => {
    expect(dueTrialEmails(endsIn(0), now)).toEqual(['ended']);
    expect(dueTrialEmails(endsIn(-1), now)).toEqual(['ended']);
    expect(dueTrialEmails(endsIn(-(TRIAL_STOPPED_MIN_DAYS - 0.5)), now)).toEqual(['ended']);
  });

  it('adds "stopped" after "ended" from day 3 through the prompt window', () => {
    expect(dueTrialEmails(endsIn(-TRIAL_STOPPED_MIN_DAYS), now)).toEqual(['ended', 'stopped']);
    expect(dueTrialEmails(endsIn(-(POST_TRIAL_PROMPT_DAYS - 0.5)), now)).toEqual(['ended', 'stopped']);
  });

  it('is empty once the post-trial prompt window has passed', () => {
    expect(dueTrialEmails(endsIn(-POST_TRIAL_PROMPT_DAYS), now)).toEqual([]);
    expect(dueTrialEmails(endsIn(-30), now)).toEqual([]);
  });

  it('never lists "ending" together with a post-boundary kind', () => {
    for (const days of [4, 3, 2, 0, -1, -3, -6]) {
      const due = dueTrialEmails(endsIn(days), now);
      if (due.includes('ending')) expect(due).toEqual(['ending']);
    }
  });
});

describe('check keys and dedupe', () => {
  it('maps each kind to its own key and grant column', () => {
    expect(trialCheckKey('ending')).toBe(TRIAL_ENDING_CHECK_KEY);
    expect(trialCheckKey('ended')).toBe(TRIAL_ENDED_CHECK_KEY);
    expect(trialCheckKey('stopped')).toBe(TRIAL_STOPPED_CHECK_KEY);
    expect(new Set([TRIAL_ENDING_CHECK_KEY, TRIAL_ENDED_CHECK_KEY, TRIAL_STOPPED_CHECK_KEY]).size).toBe(3);
    expect(trialGrantSentField('ending')).toBe('endingEmailSentAt');
    expect(trialGrantSentField('ended')).toBe('endedEmailSentAt');
    expect(trialGrantSentField('stopped')).toBe('stoppedEmailSentAt');
  });

  it('reads the flag only from a plain object', () => {
    expect(hasReceivedTrialEmail({ [TRIAL_ENDING_CHECK_KEY]: true }, 'ending')).toBe(true);
    expect(hasReceivedTrialEmail({ [TRIAL_ENDING_CHECK_KEY]: true }, 'ended')).toBe(false);
    expect(hasReceivedTrialEmail({ [TRIAL_STOPPED_CHECK_KEY]: true }, 'stopped')).toBe(true);
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

  it('keeps the stopped ask inside the candidate window', () => {
    expect(TRIAL_STOPPED_MIN_DAYS).toBeLessThan(POST_TRIAL_PROMPT_DAYS);
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
