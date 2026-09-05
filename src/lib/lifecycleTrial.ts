import { POST_TRIAL_PROMPT_DAYS } from '@/lib/billing';

/**
 * Trial-boundary lifecycle emails. The dashboard's countdown banner and
 * post-trial modal only reach users who open the app; most trial accounts
 * never come back after day one, so the boundary has to be announced by email.
 *
 * Two sends per free-trial window, each once:
 *   ending — 2 to 4 days before the window closes ("3 days left")
 *   ended  — after it closes, inside the same post-trial prompt window the
 *            dashboard uses, so a long-idle backlog is never blasted.
 */
export const TRIAL_EMAIL_VERSION = 'honest_v1';
export const TRIAL_ENDING_CHECK_KEY = 'trial_ending_v1_sent';
export const TRIAL_ENDED_CHECK_KEY = 'trial_ended_v1_sent';
export const TRIAL_ENDING_MIN_DAYS = 2;
export const TRIAL_ENDING_MAX_DAYS = 4;

const DAY_MS = 24 * 60 * 60 * 1000;

export type TrialEmailKind = 'ending' | 'ended';

/**
 * Which boundary email (if any) a user with this trial end is due for now.
 * Null outside both windows — too early, or too long past the end.
 */
export function pickTrialEmail(trialEndsAt: Date, now = new Date()): TrialEmailKind | null {
  const remainingMs = trialEndsAt.getTime() - now.getTime();
  if (remainingMs >= TRIAL_ENDING_MIN_DAYS * DAY_MS && remainingMs <= TRIAL_ENDING_MAX_DAYS * DAY_MS) {
    return 'ending';
  }
  if (remainingMs <= 0 && -remainingMs < POST_TRIAL_PROMPT_DAYS * DAY_MS) {
    return 'ended';
  }
  return null;
}

export function trialCheckKey(kind: TrialEmailKind): string {
  return kind === 'ending' ? TRIAL_ENDING_CHECK_KEY : TRIAL_ENDED_CHECK_KEY;
}

/** TrialGrant column that records delivery for this boundary. */
export function trialGrantSentField(kind: TrialEmailKind): 'endingEmailSentAt' | 'endedEmailSentAt' {
  return kind === 'ending' ? 'endingEmailSentAt' : 'endedEmailSentAt';
}

export function hasReceivedTrialEmail(actionChecks: unknown, kind: TrialEmailKind): boolean {
  if (!actionChecks || typeof actionChecks !== 'object' || Array.isArray(actionChecks)) {
    return false;
  }
  return (actionChecks as Record<string, unknown>)[trialCheckKey(kind)] === true;
}

/**
 * Oldest account creation that can still be due for either email. The trial
 * anchor (TrialGrant) is never later than createdAt, so any account older
 * than the far edge of the "ended" window is past both windows.
 */
export function trialCandidateCreatedAfter(now = new Date()): Date {
  const trialDays = 14;
  return new Date(now.getTime() - (trialDays + POST_TRIAL_PROMPT_DAYS) * DAY_MS);
}

/** Whole days since the trial ended (0 on the day it ended, or before). */
export function daysSinceTrialEnd(trialEndsAt: Date, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - trialEndsAt.getTime()) / DAY_MS));
}

/** Whole days until the trial ends (0 when past). Matches the banner's copy. */
export function daysUntilTrialEnd(trialEndsAt: Date, now = new Date()): number {
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY_MS));
}
