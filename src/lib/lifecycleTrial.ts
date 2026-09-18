import { POST_TRIAL_PROMPT_DAYS, SIGNUP_TRIAL_DAYS } from '@/lib/billing';

/**
 * Trial-boundary lifecycle emails. The dashboard's countdown banner and
 * post-trial modal only reach users who open the app; most trial accounts
 * never come back after day one, so the boundary has to be announced by email.
 *
 * Three sends per free-trial window, each once, never two in one run:
 *   ending  — 2 to 4 days before the window closes ("3 days left")
 *   ended   — after it closes, inside the same post-trial prompt window the
 *             dashboard uses, so a long-idle backlog is never blasted.
 *   stopped — from day 3 after the close to the end of that window: not a
 *             pitch, a one-question ask about why they stopped. Only for
 *             accounts with no plan activity since the boundary.
 */
export const TRIAL_EMAIL_VERSION = 'honest_v1';
export const TRIAL_ENDING_CHECK_KEY = 'trial_ending_v1_sent';
export const TRIAL_ENDED_CHECK_KEY = 'trial_ended_v1_sent';
export const TRIAL_STOPPED_CHECK_KEY = 'trial_stopped_v1_sent';
export const TRIAL_ENDING_MIN_DAYS = 2;
export const TRIAL_ENDING_MAX_DAYS = 4;
export const TRIAL_STOPPED_MIN_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export type TrialEmailKind = 'ending' | 'ended' | 'stopped';

const CHECK_KEYS: Record<TrialEmailKind, string> = {
  ending: TRIAL_ENDING_CHECK_KEY,
  ended: TRIAL_ENDED_CHECK_KEY,
  stopped: TRIAL_STOPPED_CHECK_KEY,
};

const GRANT_FIELDS = {
  ending: 'endingEmailSentAt',
  ended: 'endedEmailSentAt',
  stopped: 'stoppedEmailSentAt',
} as const;

export type TrialGrantSentField = (typeof GRANT_FIELDS)[TrialEmailKind];

/**
 * Every boundary email a user with this trial end is due for now, in send
 * order. The sender takes the first one not yet delivered, so "ended" always
 * precedes "stopped" and the two are at least a run apart. Empty outside
 * every window — too early, or too long past the end.
 */
export function dueTrialEmails(trialEndsAt: Date, now = new Date()): TrialEmailKind[] {
  const remainingMs = trialEndsAt.getTime() - now.getTime();
  if (remainingMs >= TRIAL_ENDING_MIN_DAYS * DAY_MS && remainingMs <= TRIAL_ENDING_MAX_DAYS * DAY_MS) {
    return ['ending'];
  }
  if (remainingMs > 0) return [];

  const sinceMs = -remainingMs;
  if (sinceMs >= POST_TRIAL_PROMPT_DAYS * DAY_MS) return [];
  return sinceMs >= TRIAL_STOPPED_MIN_DAYS * DAY_MS ? ['ended', 'stopped'] : ['ended'];
}

export function trialCheckKey(kind: TrialEmailKind): string {
  return CHECK_KEYS[kind];
}

/** TrialGrant column that records delivery for this boundary. */
export function trialGrantSentField(kind: TrialEmailKind): TrialGrantSentField {
  return GRANT_FIELDS[kind];
}

export function hasReceivedTrialEmail(actionChecks: unknown, kind: TrialEmailKind): boolean {
  if (!actionChecks || typeof actionChecks !== 'object' || Array.isArray(actionChecks)) {
    return false;
  }
  return (actionChecks as Record<string, unknown>)[trialCheckKey(kind)] === true;
}

/**
 * Oldest account creation, or self-serve trial start, that can still be due
 * for any of the emails. A window never starts before its account was created
 * or its own trial started, so anything older than the far edge of the
 * post-trial window is past all three.
 */
export function trialCandidateCreatedAfter(now = new Date()): Date {
  return new Date(now.getTime() - (SIGNUP_TRIAL_DAYS + POST_TRIAL_PROMPT_DAYS) * DAY_MS);
}

/** Whole days since the trial ended (0 on the day it ended, or before). */
export function daysSinceTrialEnd(trialEndsAt: Date, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - trialEndsAt.getTime()) / DAY_MS));
}

/** Whole days until the trial ends (0 when past). Matches the banner's copy. */
export function daysUntilTrialEnd(trialEndsAt: Date, now = new Date()): number {
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY_MS));
}
