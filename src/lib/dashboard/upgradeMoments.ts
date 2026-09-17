import { SIGNUP_TRIAL_DAYS } from '@/lib/billing';
import { formatCurrencyWhole } from '@/lib/utils';
import { floorDollars, floorWhole, shortMonthLabel } from './format';
import type { MonthlyInterest, PlanReadiness, RateWatch, TrialMoment } from './types';

/**
 * Upgrade moments A–D (spec §7; README §7). Copy only: the components own
 * the actions. Every figure is one the insights endpoint computed.
 */

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** Moment A: the self-serve trial sheet. "Two weeks" is guarded by a test on SIGNUP_TRIAL_DAYS. */
export const MOMENT_A = {
  badge: `${SIGNUP_TRIAL_DAYS} days free · no card`,
  title: 'See what your plan looks like with every move switched on.',
  body: 'Two weeks of the full coach, what-if scenarios and unlimited debts. Nothing is charged, and nothing is removed from your plan when it ends.',
  cta: `Start my ${SIGNUP_TRIAL_DAYS} days`,
  pending: 'Starting…',
  footnote: 'No card. Ends on its own.',
} as const;

/** The copy for POST /api/trial/start's refusals; null for anything else. */
export function trialStartErrorMessage(status: number | undefined): string | null {
  if (status === 409) return 'This email has already used its free trial.';
  if (status === 429) return 'Too many tries. Wait a few minutes, then try again.';
  if (status === 403) return "Free trials aren't available on this account yet.";
  return null;
}

/** localStorage key that hides a dismissed moment for this trial only. */
export function momentDismissKey(state: 'B' | 'D', endsAt: string): string {
  return `sp_trial_moment_${state}:${endsAt}`;
}

// ── Moment B: trial days 1–3 ─────────────────────────────────────────────────

export type ChecklistRowId = 'setup' | 'what_if' | 'apr_script';
export interface ChecklistRow { id: ChecklistRowId; label: string; done: boolean; affordance: string | null }
export interface MomentBView { eyebrow: string; daysLeft: string; title: string; rows: ChecklistRow[] }

/**
 * Only setup has a tracked finish (readiness 5 of 5); what-ifs and calls are
 * not recorded, so their rows never tick. The call needs a card to call.
 */
export function momentBView(
  moment: { day: number; daysLeft: number },
  readiness: PlanReadiness,
  rateWatch: RateWatch | null,
): MomentBView {
  const setupDone = readiness.steps.every((step) => step.complete);
  const rows: ChecklistRow[] = [
    { id: 'setup', label: 'Finish your plan setup', done: setupDone, affordance: setupDone ? null : 'Open →' },
    { id: 'what_if', label: 'Run one what-if', done: false, affordance: 'Open →' },
    ...(rateWatch
      ? [{ id: 'apr_script' as const, label: 'Call one card about its APR', done: false, affordance: 'Script →' }]
      : []),
  ];
  return {
    eyebrow: `Pro is on · day ${moment.day}`,
    daysLeft: `${moment.daysLeft} ${plural(moment.daysLeft, 'day', 'days')} left`,
    title: `${rows.length === 3 ? 'Three' : 'Two'} things worth doing while it's on.`,
    rows,
  };
}

// ── Moment C: the last 3 days ────────────────────────────────────────────────

export interface MomentCView {
  eyebrow: string | null;
  title: string;
  rows: Array<{ label: string; value: string }>;
  price: string;
  priceNote: string;
  cta: string;
}

/** Rows only for positive figures; "Projected interest" because it compares two projections (X12). */
export function momentCView(
  moment: Extract<TrialMoment, { state: 'C' }>,
  interest: MonthlyInterest | null,
  price: number,
): MomentCView {
  const left = `${moment.daysLeft} ${plural(moment.daysLeft, 'day', 'days')} left of Pro`;
  const rows = [
    ...(moment.monthsSooner !== null
      ? [{ label: 'Debt-free date', value: `${moment.monthsSooner} ${plural(moment.monthsSooner, 'month', 'months')} sooner` }]
      : []),
    ...(moment.interestLess !== null ? [{ label: 'Projected interest', value: `${floorWhole(moment.interestLess)} less` }] : []),
    ...(moment.paymentsLogged !== null ? [{ label: 'Payments logged', value: String(moment.paymentsLogged) }] : []),
  ];
  const monthly = interest ? floorDollars(interest.monthlyEstimate) : 0;
  return {
    eyebrow: rows.length > 0 ? left : null,
    title: rows.length > 0 ? `What the last ${moment.elapsedDays} days actually moved.` : `${left}.`,
    rows,
    price: formatCurrencyWhole(price),
    priceNote: monthly >= 1 ? `/month · against ${formatCurrencyWhole(monthly)}/mo est. interest` : '/month',
    cta: 'Keep Pro',
  };
}

// ── Moment D: just ended ─────────────────────────────────────────────────────

export interface MomentDView {
  eyebrow: string;
  title: string;
  kept: { label: string; headline: string; summary: string; note: string } | null;
  body: string | null;
  primaryCta: string;
  secondaryCta: string;
}

/** "Kept — Sep 10" in the reader's time zone; "Kept" when the date can't be read. */
function keptLabel(generatedAt: string | null): string {
  const date = generatedAt ? new Date(generatedAt) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Kept';
  return `Kept — ${shortMonthLabel(date.getMonth())} ${date.getDate()}`;
}

/**
 * The cached brief is the kept artifact (README "the endowment point"). A
 * brief can only be generated with Pro, so the note's claim holds for any
 * cached one. Without a brief, only the plan promise remains.
 */
export function momentDView(
  brief: { headline: string; summary: string } | null,
  generatedAt: string | null,
  price: number,
): MomentDView {
  const shared = {
    eyebrow: 'Back on Free · your plan is intact',
    primaryCta: `Turn Pro back on — ${formatCurrencyWhole(price)}/mo`,
    secondaryCta: 'Stay on Free for now',
  };
  if (!brief) {
    return { ...shared, title: 'Nothing was removed from your plan.', kept: null, body: null };
  }
  return {
    ...shared,
    title: "Your last coach brief stays. New ones don't.",
    kept: {
      label: keptLabel(generatedAt),
      headline: brief.headline,
      summary: brief.summary,
      note: 'Fully readable. It was generated while you had Pro, so it stays yours.',
    },
    body: "From here your balances keep moving and the brief doesn't. Pro is what keeps it current.",
  };
}
