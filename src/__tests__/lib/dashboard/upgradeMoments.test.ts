import { describe, expect, it } from 'vitest';
import { SIGNUP_TRIAL_DAYS } from '@/lib/billing';
import {
  MOMENT_A, momentBView, momentCView, momentDView, momentDismissKey, trialStartErrorMessage,
} from '@/lib/dashboard/upgradeMoments';
import type { PlanReadiness, RateWatch } from '@/lib/dashboard/types';

const PRICE = 9;
const CARD = { debtId: 'c1', debtName: 'Citi', apr: 28, targetApr: 19.6, annualEstimate: 742.9 };
const RATE_WATCH: RateWatch = { cards: 1, annualEstimate: 742.9, top: CARD, moveTarget: CARD };

function readiness(done: number): PlanReadiness {
  const ids = ['debts', 'income', 'expenses', 'dueDates', 'firstPayment'] as const;
  const steps = ids.map((id, i) => ({ id, complete: i < done, pendingCount: i < done ? 0 : 1 }));
  return { steps, completeCount: done, percent: done * 20 };
}

function momentC(overrides: Partial<{ daysLeft: number; elapsedDays: number; monthsSooner: number | null; interestLess: number | null; paymentsLogged: number | null }> = {}) {
  return { state: 'C' as const, daysLeft: 2, elapsedDays: 12, monthsSooner: 7, interestLess: 6_361.9, paymentsLogged: 9, ...overrides };
}

describe('moment A copy (README §7 A)', () => {
  it('is the handoff copy with the trial length from the constant', () => {
    expect(MOMENT_A).toEqual({
      badge: `${SIGNUP_TRIAL_DAYS} days free · no card`,
      title: 'See what your plan looks like with every move switched on.',
      body: 'Two weeks of the full coach, what-if scenarios and unlimited debts. Nothing is charged, and nothing is removed from your plan when it ends.',
      cta: `Start my ${SIGNUP_TRIAL_DAYS} days`,
      pending: 'Starting…',
      footnote: 'No card. Ends on its own.',
    });
  });

  it('says "Two weeks" only while the trial is 14 days long', () => {
    expect(SIGNUP_TRIAL_DAYS).toBe(14);
  });

  it('names the refusals a start can meet', () => {
    expect(trialStartErrorMessage(409)).toBe('This email has already used its free trial.');
    expect(trialStartErrorMessage(429)).toBe('Too many tries. Wait a few minutes, then try again.');
    expect(trialStartErrorMessage(403)).toBe("Free trials aren't available on this account yet.");
    expect(trialStartErrorMessage(500)).toBeNull();
    expect(trialStartErrorMessage(undefined)).toBeNull();
  });
});

describe('momentBView (plan decision 5)', () => {
  it('lists three things while setup is unfinished and a card can be called', () => {
    expect(momentBView({ day: 2, daysLeft: 12 }, readiness(3), RATE_WATCH)).toEqual({
      eyebrow: 'Pro is on · day 2',
      daysLeft: '12 days left',
      title: "Three things worth doing while it's on.",
      rows: [
        { id: 'setup', label: 'Finish your plan setup', done: false, affordance: 'Open →' },
        { id: 'what_if', label: 'Run one what-if', done: false, affordance: 'Open →' },
        { id: 'apr_script', label: 'Call one card about its APR', done: false, affordance: 'Script →' },
      ],
    });
  });

  it('ticks a finished setup and drops the call with no card to call', () => {
    const view = momentBView({ day: 1, daysLeft: 1 }, readiness(5), null);
    expect(view.title).toBe("Two things worth doing while it's on.");
    expect(view.daysLeft).toBe('1 day left');
    expect(view.rows.map((r) => [r.id, r.done, r.affordance])).toEqual([
      ['setup', true, null],
      ['what_if', false, 'Open →'],
    ]);
  });
});

describe('momentCView (plan decision 6)', () => {
  it('shows each positive row, floors the interest, and anchors the price to the est. monthly interest', () => {
    expect(momentCView(momentC(), { monthlyEstimate: 840.99, avgMonthlySavedByPlan: null }, PRICE)).toEqual({
      eyebrow: '2 days left of Pro',
      title: 'What the last 12 days actually moved.',
      rows: [
        { label: 'Debt-free date', value: '7 months sooner' },
        { label: 'Projected interest', value: '$6,361 less' },
        { label: 'Payments logged', value: '9' },
      ],
      price: '$9',
      priceNote: '/month · against $840/mo est. interest',
      cta: 'Keep Pro',
    });
  });

  it('uses singulars and keeps only the rows that exist', () => {
    const view = momentCView(momentC({ monthsSooner: 1, interestLess: null, paymentsLogged: null, daysLeft: 1 }), null, PRICE);
    expect(view.rows).toEqual([{ label: 'Debt-free date', value: '1 month sooner' }]);
    expect(view.eyebrow).toBe('1 day left of Pro');
    expect(view.priceNote).toBe('/month');
  });

  it('with no rows, the countdown is the title and there is no eyebrow', () => {
    const view = momentCView(momentC({ monthsSooner: null, interestLess: null, paymentsLogged: null, daysLeft: 3 }), { monthlyEstimate: 0.5, avgMonthlySavedByPlan: null }, PRICE);
    expect(view.eyebrow).toBeNull();
    expect(view.title).toBe('3 days left of Pro.');
    expect(view.rows).toEqual([]);
    expect(view.priceNote).toBe('/month');
  });
});

describe('momentDView (plan decision 7)', () => {
  it('keeps the last brief, dated in the reader\'s time zone', () => {
    const generatedAt = new Date(2026, 8, 10, 12).toISOString();
    expect(momentDView({ headline: 'Payments stalling.', summary: 'Two debts missed September.' }, generatedAt, PRICE)).toEqual({
      eyebrow: 'Back on Free · your plan is intact',
      title: "Your last coach brief stays. New ones don't.",
      kept: {
        label: 'Kept — Sep 10',
        headline: 'Payments stalling.',
        summary: 'Two debts missed September.',
        note: 'Fully readable. It was generated while you had Pro, so it stays yours.',
      },
      body: "From here your balances keep moving and the brief doesn't. Pro is what keeps it current.",
      primaryCta: 'Turn Pro back on — $9/mo',
      secondaryCta: 'Stay on Free for now',
    });
  });

  it('without a brief, says only that nothing was removed', () => {
    expect(momentDView(null, null, PRICE)).toMatchObject({
      title: 'Nothing was removed from your plan.',
      kept: null,
      body: null,
      primaryCta: 'Turn Pro back on — $9/mo',
    });
  });

  it('labels a brief with an unreadable date "Kept"', () => {
    expect(momentDView({ headline: 'h', summary: 's' }, 'not a date', PRICE).kept?.label).toBe('Kept');
  });
});

describe('momentDismissKey', () => {
  it('is per state and per trial end', () => {
    expect(momentDismissKey('B', '2026-10-01T12:00:00.000Z')).toBe('sp_trial_moment_B:2026-10-01T12:00:00.000Z');
    expect(momentDismissKey('D', '2026-09-15T12:00:00.000Z')).toBe('sp_trial_moment_D:2026-09-15T12:00:00.000Z');
  });
});
