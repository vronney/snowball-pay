// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { MonthlyInterest, PlanReadiness, RateWatch, TrialMoment } from '@/lib/dashboard/types';
import { useCachedCoachBrief, useStartCheckout } from '@/lib/hooks';
import { track, Events } from '@/lib/analytics';
import { PLANS } from '@/lib/stripe';
import { formatCurrencyWhole } from '@/lib/utils';
import TrialMomentCard from '@/components/dashboard-v2/upgrade/TrialMomentCard';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useStartCheckout: vi.fn(),
  useCachedCoachBrief: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));

const ENDS = '2026-10-01T12:00:00.000Z';
const CARD = { debtId: 'c1', debtName: 'Citi', apr: 28, targetApr: 19.6, annualEstimate: 742.9 };
const RATE_WATCH: RateWatch = { cards: 1, annualEstimate: 742.9, top: CARD, moveTarget: CARD };
const INTEREST: MonthlyInterest = { monthlyEstimate: 840.36, avgMonthlySavedByPlan: null };
const NO_BRIEF = { data: { brief: null, dataHash: null, generatedAt: null }, isLoading: false };

function readiness(done: number): PlanReadiness {
  const ids = ['debts', 'income', 'expenses', 'dueDates', 'firstPayment'] as const;
  const steps = ids.map((id, i) => ({ id, complete: i < done, pendingCount: i < done ? 0 : 1 }));
  return { steps, completeCount: done, percent: done * 20 };
}

function renderCard(moment: TrialMoment, overrides: Record<string, unknown> = {}, brief: unknown = NO_BRIEF) {
  const mutate = vi.fn();
  vi.mocked(useStartCheckout).mockReturnValue(
    { mutate, isPending: false, isError: false, error: null } as unknown as ReturnType<typeof useStartCheckout>,
  );
  vi.mocked(useCachedCoachBrief).mockReturnValue(brief as ReturnType<typeof useCachedCoachBrief>);
  const onChecklist = vi.fn();
  const props = { moment, trialEndsAt: ENDS, readiness: readiness(3), rateWatch: RATE_WATCH, interest: INTEREST, onChecklist, ...overrides };
  const view = render(createElement(TrialMomentCard, props));
  return { mutate, onChecklist, view, props };
}

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('TrialMomentCard — moment B (plan decision 5)', () => {
  const B: TrialMoment = { state: 'B', day: 2, daysLeft: 12 };

  it('shows the day, the days left and three things to do, and records the view', () => {
    renderCard(B);
    expect(screen.getByText('Pro is on · day 2')).toBeTruthy();
    expect(screen.getByText('12 days left')).toBeTruthy();
    expect(screen.getByRole('heading', { name: "Three things worth doing while it's on." })).toBeTruthy();
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_VIEWED, { state: 'B' });
  });

  it('sends each open row to its flow and records the press', () => {
    const { onChecklist } = renderCard(B);
    fireEvent.click(screen.getByRole('button', { name: 'Call one card about its APR' }));
    expect(onChecklist).toHaveBeenCalledWith('apr_script');
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'B', action: 'apr_script' });
    fireEvent.click(screen.getByRole('button', { name: 'Run one what-if' }));
    expect(onChecklist).toHaveBeenCalledWith('what_if');
    fireEvent.click(screen.getByRole('button', { name: 'Finish your plan setup' }));
    expect(onChecklist).toHaveBeenCalledWith('setup');
  });

  it('ticks a finished setup instead of offering it', () => {
    renderCard(B, { readiness: readiness(5) });
    expect(screen.queryByRole('button', { name: 'Finish your plan setup' })).toBeNull();
    expect(screen.getByText('Finish your plan setup')).toBeTruthy();
  });

  it('dismisses for this trial and stays dismissed', () => {
    const { view, props } = renderCard(B);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'B', action: 'dismiss' });
    expect(screen.queryByText('Pro is on · day 2')).toBeNull();
    expect(localStorage.getItem(`sp_trial_moment_B:${ENDS}`)).toBe('1');

    view.unmount();
    vi.mocked(track).mockClear();
    render(createElement(TrialMomentCard, props));
    expect(screen.queryByText('Pro is on · day 2')).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });
});

describe('TrialMomentCard — moment C (plan decision 6)', () => {
  const C: TrialMoment = { state: 'C', daysLeft: 2, elapsedDays: 12, monthsSooner: 7, interestLess: 6_361.9, paymentsLogged: 9 };

  it('shows what moved and the price against the est. interest, with no dismiss', () => {
    renderCard(C);
    expect(screen.getByText('2 days left of Pro')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'What the last 12 days actually moved.' })).toBeTruthy();
    expect(screen.getByText('7 months sooner')).toBeTruthy();
    expect(screen.getByText('$6,361 less')).toBeTruthy();
    expect(screen.getByText(formatCurrencyWhole(PLANS.pro.price))).toBeTruthy();
    expect(screen.getByText('/month · against $840/mo est. interest')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_VIEWED, { state: 'C' });
  });

  it('keeps Pro through the existing checkout', () => {
    const { mutate } = renderCard(C);
    fireEvent.click(screen.getByRole('button', { name: 'Keep Pro' }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'C', action: 'checkout' });
    expect(track).toHaveBeenCalledWith(Events.CHECKOUT_STARTED, { source: 'upgrade_moment_c', billing: 'monthly' });
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});

describe('TrialMomentCard — moment D (plan decision 7)', () => {
  const D: TrialMoment = { state: 'D', endedAt: '2026-09-15T12:00:00.000Z' };
  const BRIEF = {
    data: {
      brief: { verdict: { status: 'at_risk', headline: 'Payments stalling.', summary: 'Two debts missed September.' }, nextAction: { title: 't', body: 'b' } },
      dataHash: 'h',
      generatedAt: new Date(2026, 8, 10, 12).toISOString(),
    },
    isLoading: false,
  };

  it('keeps the last brief and turns Pro back on through checkout', () => {
    const { mutate } = renderCard(D, {}, BRIEF);
    expect(screen.getByText('Back on Free · your plan is intact')).toBeTruthy();
    expect(screen.getByRole('heading', { name: "Your last coach brief stays. New ones don't." })).toBeTruthy();
    expect(screen.getByText('Kept — Sep 10')).toBeTruthy();
    expect(screen.getByText('Payments stalling.')).toBeTruthy();
    expect(screen.getByText('Two debts missed September.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: `Turn Pro back on — ${formatCurrencyWhole(PLANS.pro.price)}/mo` }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'D', action: 'checkout' });
    expect(track).toHaveBeenCalledWith(Events.CHECKOUT_STARTED, { source: 'upgrade_moment_d', billing: 'monthly' });
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('without a brief, says only that nothing was removed', () => {
    renderCard(D);
    expect(screen.getByRole('heading', { name: 'Nothing was removed from your plan.' })).toBeTruthy();
    expect(screen.queryByText(/^Kept/)).toBeNull();
  });

  it('shows nothing, and records no view, until the brief query settles', () => {
    renderCard(D, {}, { data: undefined, isLoading: true });
    expect(screen.queryByText('Back on Free · your plan is intact')).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });

  it('"Stay on Free for now" dismisses it for this trial end', () => {
    renderCard(D, {}, BRIEF);
    fireEvent.click(screen.getByRole('button', { name: 'Stay on Free for now' }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'D', action: 'dismiss' });
    expect(screen.queryByText('Back on Free · your plan is intact')).toBeNull();
    expect(localStorage.getItem('sp_trial_moment_D:2026-09-15T12:00:00.000Z')).toBe('1');
  });
});
