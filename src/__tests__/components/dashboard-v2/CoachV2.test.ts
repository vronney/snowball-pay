// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { DashboardInsights } from '@/lib/dashboard/types';
import {
  useDashboardInsights, useMarkPaid, useSaveIncome, useSubscription,
} from '@/lib/hooks';
import { track, Events } from '@/lib/analytics';
import { upgradeEvents } from '@/lib/upgradeEvents';
import { PLANS } from '@/lib/stripe';
import { formatCurrencyWhole } from '@/lib/utils';
import CoachV2 from '@/components/dashboard-v2/coach/CoachV2';
import {
  makeCallAprMove, makeDebt, makeIncome, makeLogMissedMove, makeSwitchMove, makeUnallocatedMove,
} from '../../lib/dashboard/fixtures';

const intel = vi.hoisted(() => ({ last: null as null | Record<string, unknown> }));

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useDashboardInsights: vi.fn(),
  useSaveIncome: vi.fn(),
  useSubscription: vi.fn(),
  useMarkPaid: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));
// The v1 Pro content is its own component; here it only records its props.
vi.mock('@/components/tabs/IntelligenceTab', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (p: Record<string, unknown>) => {
      intel.last = p;
      return h('div', { 'data-stub': 'IntelligenceTab' });
    },
  };
});

const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
const PRO = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null } };
const INCOME = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, payoffMethod: 'snowball', accelerationAmount: 200 });
const DEBTS = [
  makeDebt({ id: 'visa', name: 'Visa', balance: 900, minimumPayment: 25, dueDate: 5 }),
  makeDebt({ id: 'car', name: 'Car loan', balance: 9_000, minimumPayment: 310, dueDate: 20 }),
];
const RATE_CARD = { debtId: 'citi', debtName: 'Citi', apr: 28, targetApr: 19.6, annualEstimate: 742.9 };
const PRO_PRICE_PER_YEAR = formatCurrencyWhole(PLANS.pro.price * 12);

function insights(overrides: Partial<DashboardInsights> = {}): DashboardInsights {
  return {
    asOf: { year: 2026, month: 8, day: 15 },
    tier: FREE,
    readiness: { steps: [], completeCount: 0, percent: 0 },
    interest: { monthlyEstimate: 840.36, avgMonthlySavedByPlan: 278.3 },
    paymentGap: { expected: 2, logged: 0, missed: [{ debtId: 'visa', minimumPayment: 25 }], missedMinimums: 25, notYetDue: 1 },
    coachMoves: [makeLogMissedMove('Sep', 1), makeSwitchMove('avalanche', 1030), makeCallAprMove('citi', 742.9)],
    rateWatch: { cards: 1, annualEstimate: 742.9, top: RATE_CARD, moveTarget: RATE_CARD },
    strategy: null,
    planGap: null,
    progress: null,
    plan: null,
    uncounted: null,
    ...overrides,
  };
}

const saveIncome = { mutate: vi.fn(), isPending: false };

function renderTab({
  data = insights(), placeholder = false, subscription,
}: { data?: DashboardInsights; placeholder?: boolean; subscription?: { proEligible: boolean } } = {}) {
  vi.mocked(useDashboardInsights).mockReturnValue(
    { data, isPlaceholderData: placeholder } as unknown as ReturnType<typeof useDashboardInsights>,
  );
  vi.mocked(useSaveIncome).mockReturnValue(saveIncome as unknown as ReturnType<typeof useSaveIncome>);
  // DebtsV2.test.ts's pattern: the subscription tier tracks the insights tier by default.
  vi.mocked(useSubscription).mockReturnValue(
    { data: subscription ?? { proEligible: data.tier.proEligible } } as unknown as ReturnType<typeof useSubscription>,
  );
  vi.mocked(useMarkPaid).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useMarkPaid>);
  const onNavigate = vi.fn();
  render(createElement(CoachV2, { debts: DEBTS, income: INCOME, expenses: [], isLoading: false, onNavigate }));
  return { onNavigate };
}

afterEach(() => {
  vi.clearAllMocks();
  intel.last = null;
});

describe('CoachV2 for Free (spec §8.5 Coach)', () => {
  it('stacks the compact meter, the chip-less free move, rate watch, the priced list and the closing card, with no v1 Pro content', () => {
    renderTab();
    expect(screen.getByText('$840').className).toContain('text-[32px]');
    expect(screen.getByRole('heading', { name: 'Log the missing payment for Sep.' })).toBeTruthy();
    expect(screen.queryByText('High')).toBeNull();
    const rateWatch = screen.getByText('Rate watch · 1 card');
    expect(rateWatch.closest('[class*="max-[768px]:hidden"]')).toBeNull();
    expect(screen.getAllByRole('button', { name: '2 more moves found — Pro' })).toHaveLength(1);
    expect(screen.getByText('Switch to Avalanche — $1,030 less interest.')).toBeTruthy();
    expect(screen.getByText('$742/yr est.')).toBeTruthy();
    expect(screen.getByText(`Those 2 are worth $742/yr, plus $1,030 over the plan. Pro is ${PRO_PRICE_PER_YEAR}/yr.`)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unlock all 2' })).toBeTruthy();
    expect(document.querySelector('[data-stub="IntelligenceTab"]')).toBeNull();
  });

  it('opens the upgrade modal with the coach copy from the list and the closing CTA, tracking the gated press', () => {
    const handler = vi.fn();
    const unsubscribe = upgradeEvents.subscribe(handler);
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: '2 more moves found — Pro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unlock all 2' }));
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith('Coach moves');
    expect(track).toHaveBeenCalledWith(Events.COACH_MOVE_CTA, { move: 'more_moves', gated: true });
    unsubscribe();
  });

  it("applies unused cash in one tap with the Plan tab's payload", () => {
    renderTab({ data: insights({ coachMoves: [makeUnallocatedMove(3, true), makeCallAprMove('citi', 742.9)] }) });
    fireEvent.click(screen.getByRole('button', { name: 'Apply $200/mo' }));
    expect(saveIncome.mutate).toHaveBeenCalledWith(
      { monthlyTakeHome: 4_000, essentialExpenses: 2_000, extraPayment: 0, payoffMethod: 'snowball', accelerationAmount: 700 },
      expect.any(Object),
    );
    expect(track).toHaveBeenCalledWith(Events.COACH_MOVE_CTA, { move: 'use_unallocated', gated: false });
  });

  it('logs the missing payment through the bulk sheet, never on placeholder-day data', () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Log it now' }));
    expect(screen.getByRole('dialog', { name: 'Log Sep payments' })).toBeTruthy();
    expect(track).toHaveBeenCalledWith(Events.COACH_MOVE_CTA, { move: 'log_missed', gated: false });
  });

  it('holds the log sheet on placeholder-day data', () => {
    renderTab({ placeholder: true });
    fireEvent.click(screen.getByRole('button', { name: 'Log it now' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the empty card when nothing has a figure', () => {
    const { onNavigate } = renderTab({ data: insights({ interest: null, coachMoves: [], rateWatch: null }) });
    expect(screen.getByText('Nothing to show for September yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go to My Debts' }));
    expect(onNavigate).toHaveBeenCalledWith('debts');
  });
});

describe('CoachV2 for Pro', () => {
  it('opens every move with its action, keeps rate watch, then renders the v1 Pro content', () => {
    renderTab({
      data: insights({ tier: PRO, coachMoves: [makeLogMissedMove('Sep', 1, true), makeSwitchMove('avalanche', 1030, true), makeCallAprMove('citi', 742.9, true)] }),
    });
    expect(screen.getByText('$840').className).toContain('text-[32px]');
    expect(screen.getByRole('button', { name: 'Log it now' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Switch to Avalanche' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open the call script' })).toBeTruthy();
    expect(screen.queryByText(/more moves found/)).toBeNull();
    expect(screen.queryByText(/Unlock all/)).toBeNull();
    expect(screen.getByText('Rate watch · 1 card')).toBeTruthy();
    expect(document.querySelector('[data-stub="IntelligenceTab"]')).not.toBeNull();
    expect(intel.last).toMatchObject({ isLoading: false, aprOpenRequest: null });
  });

  it('switches the strategy in one tap and asks the APR card to open the script', () => {
    renderTab({ data: insights({ tier: PRO, coachMoves: [makeSwitchMove('avalanche', 1030, true), makeCallAprMove('citi', 742.9, true)] }) });
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Avalanche' }));
    expect(saveIncome.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ payoffMethod: 'avalanche', accelerationAmount: 200 }),
      expect.any(Object),
    );
    // Let the switch save settle (PR 5's serialization fix disables every
    // row's CTA, including this unrelated apr_script row, while any save is
    // pending) before opening the call script, matching a real mutation's
    // onSettled callback — the mock only doesn't call it on its own.
    const [, saveOptions] = saveIncome.mutate.mock.calls[0] as [unknown, { onSettled: () => void }];
    act(() => saveOptions.onSettled());
    fireEvent.click(screen.getByRole('button', { name: 'Open the call script' }));
    expect(intel.last?.aprOpenRequest).toMatchObject({ debtId: 'citi' });
    expect(track).toHaveBeenCalledWith(Events.COACH_MOVE_CTA, { move: 'call_apr', gated: false });
  });

  it('serializes one-tap saves: a second move stays disabled while the first is pending', () => {
    renderTab({
      data: insights({ tier: PRO, coachMoves: [makeUnallocatedMove(3, true), makeSwitchMove('avalanche', 1030, true)] }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply $200/mo' }));
    expect(saveIncome.mutate).toHaveBeenCalledTimes(1);
    const applyButton = screen.getByRole('button', { name: 'Saving…' });
    expect(applyButton.hasAttribute('disabled')).toBe(true);
    const switchButton = screen.getByRole('button', { name: 'Switch to Avalanche' });
    expect(switchButton.hasAttribute('disabled')).toBe(true);

    fireEvent.click(switchButton);
    expect(saveIncome.mutate).toHaveBeenCalledTimes(1);
    expect(track).not.toHaveBeenCalledWith(Events.COACH_MOVE_CTA, { move: 'switch_strategy', gated: false });
  });

  it('keeps IntelligenceTab mounted with the page\'s resolved isPro verdict on transient tier skew (insights Pro, subscription Free)', () => {
    renderTab({
      data: insights({ tier: PRO, coachMoves: [makeLogMissedMove('Sep', 1, true), makeSwitchMove('avalanche', 1030, true), makeCallAprMove('citi', 742.9, true)] }),
      subscription: { proEligible: false },
    });
    expect(screen.getByRole('button', { name: 'Log it now' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Switch to Avalanche' })).toBeTruthy();
    expect(document.querySelector('[data-stub="IntelligenceTab"]')).not.toBeNull();
    expect(intel.last?.isPro).toBe(true);
  });
});
