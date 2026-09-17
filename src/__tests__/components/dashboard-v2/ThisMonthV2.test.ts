// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { DashboardInsights, PlanReadiness } from '@/lib/dashboard/types';
import { useDashboardInsights, useMarkPaid, useSaveIncome, useUpdateDebt } from '@/lib/hooks';
import { track } from '@/lib/analytics';
import { upgradeEvents } from '@/lib/upgradeEvents';
import ThisMonthV2 from '@/components/dashboard-v2/this-month/ThisMonthV2';
import {
  makeCallAprMove, makeDebt, makeIncome, makeLogMissedMove, makeSwitchMove,
} from '../../lib/dashboard/fixtures';

const coachBrief = vi.hoisted(() => ({ props: null as null | { onApplyAction?: (targetExtra: number) => void } }));

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useDashboardInsights: vi.fn(),
  useSaveIncome: vi.fn(),
  useMarkPaid: vi.fn(),
  useUpdateDebt: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));
vi.mock('@/components/payoff/CoachBriefCard', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (props: { onApplyAction?: (targetExtra: number) => void }) => {
      coachBrief.props = props;
      return h('div', { 'data-stub': 'CoachBriefCard' });
    },
  };
});

const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null, eligible: false } };
const PRO = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null, eligible: false } };
const RATE_CARD = { debtId: 'c1', debtName: 'Citi', apr: 28, targetApr: 19.6, annualEstimate: 742.9 };

const DEBTS = [
  makeDebt({ id: 'a', name: 'Visa', balance: 900, originalBalance: 1_000, minimumPayment: 25 }),
  makeDebt({ id: 'b', name: 'Car loan', balance: 9_000, minimumPayment: 310, dueDate: 5 }),
];

function readiness(done: ReadonlyArray<PlanReadiness['steps'][number]['id']>, dueDatesPending = 1): PlanReadiness {
  const ids = ['debts', 'income', 'expenses', 'dueDates', 'firstPayment'] as const;
  const steps = ids.map((id) => ({
    id,
    complete: done.includes(id),
    pendingCount: done.includes(id) ? 0 : id === 'dueDates' ? dueDatesPending : 1,
  }));
  return { steps, completeCount: done.length, percent: done.length * 20 };
}

function insights(overrides: Partial<DashboardInsights> = {}): DashboardInsights {
  return {
    asOf: { year: 2026, month: 8, day: 14 },
    tier: FREE,
    readiness: readiness(['debts', 'income', 'expenses']),
    interest: { monthlyEstimate: 840.36, avgMonthlySavedByPlan: 278.3 },
    paymentGap: { expected: 2, logged: 0, missed: [{ debtId: 'b', minimumPayment: 310 }], missedMinimums: 310, notYetDue: 1 },
    coachMoves: [makeLogMissedMove('Sep', 1), makeSwitchMove('avalanche', 1030), makeCallAprMove('c1', 742)],
    rateWatch: { cards: 1, annualEstimate: 742.9, top: RATE_CARD, moveTarget: RATE_CARD },
    strategy: null,
    planGap: null,
    progress: null,
    plan: { method: 'snowball', months: 31, debtFreeDate: '2029-04-14', totalInterest: 5_000 },
    uncounted: null,
    trialMoment: null,
    ...overrides,
  };
}

const saveIncome = { mutate: vi.fn(), isPending: false };

type QueryState = { isError?: boolean; refetch?: () => void; isPlaceholderData?: boolean };

function renderTab(
  data: DashboardInsights | undefined,
  query: QueryState = {},
  overrides: { debts?: ReturnType<typeof makeDebt>[]; income?: ReturnType<typeof makeIncome> | undefined } = {},
) {
  const mockQuery = (next: DashboardInsights | undefined, nextQuery: QueryState) =>
    vi.mocked(useDashboardInsights).mockReturnValue(
      { data: next, isError: false, isPlaceholderData: false, refetch: vi.fn(), ...nextQuery } as unknown as ReturnType<typeof useDashboardInsights>,
    );
  mockQuery(data, query);
  vi.mocked(useSaveIncome).mockReturnValue(saveIncome as unknown as ReturnType<typeof useSaveIncome>);
  const markPaid = { mutateAsync: vi.fn().mockResolvedValue({}) };
  vi.mocked(useMarkPaid).mockReturnValue(markPaid as unknown as ReturnType<typeof useMarkPaid>);
  vi.mocked(useUpdateDebt).mockReturnValue({ mutateAsync: vi.fn() } as unknown as ReturnType<typeof useUpdateDebt>);
  const onNavigate = vi.fn();
  const onSetPendingCoachExtra = vi.fn();
  const debts = overrides.debts ?? DEBTS;
  // Distinguish "not passed" (default income) from an explicit `income: undefined`
  // override — a default-parameter destructure can't tell those apart.
  const income = 'income' in overrides ? overrides.income : makeIncome();
  const props = { debts, income, onNavigate, onSetPendingCoachExtra };
  const view = render(createElement(ThisMonthV2, props));
  // New insights arriving while mounted, e.g. the next day's figures.
  const rerenderWith = (next: DashboardInsights, nextQuery: QueryState = {}) => {
    mockQuery(next, nextQuery);
    view.rerender(createElement(ThisMonthV2, props));
  };
  return { onNavigate, onSetPendingCoachExtra, markPaid, rerenderWith };
}

afterEach(() => {
  vi.clearAllMocks();
  coachBrief.props = null;
});

describe('ThisMonthV2', () => {
  it("opens no payment sheet while the previous day's figures stand in as a placeholder", () => {
    renderTab(
      insights({ readiness: readiness(['debts', 'income', 'expenses', 'dueDates'], 0) }),
      { isPlaceholderData: true },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Log it now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Log your first payment' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });

  it('keeps an open payment sheet on the month it was opened for when the day turns over', async () => {
    const { markPaid, rerenderWith } = renderTab(insights());
    fireEvent.click(screen.getByRole('button', { name: 'Log it now' }));
    rerenderWith(insights({ asOf: { year: 2026, month: 9, day: 1 } }));
    const sheet = screen.getByRole('dialog', { name: 'Log Sep payments' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Log 1 payment' }));
    await waitFor(() =>
      expect(markPaid.mutateAsync).toHaveBeenCalledWith({ debtId: 'b', amount: 310, dueYear: 2026, dueMonth: 8 }),
    );
  });

  it('lays out the Free tab: readiness, interest, hero, rate watch (not on phones), free move', () => {
    renderTab(insights());
    expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual([
      'Your plan is 60% set up',
      'Interest going to lenders this month',
      'Debt-free by',
      'Rate watch · 1 card',
      'Log the missing payment for Sep.',
    ]);
    const rateWatch = screen.getByRole('heading', { name: 'Rate watch · 1 card' }).closest('[data-card="rate-watch"]');
    expect(rateWatch?.className).toContain('max-[768px]:hidden');
  });

  it('hides readiness at 5 of 5 and every card without a figure, then says so', () => {
    renderTab(insights({
      readiness: readiness(['debts', 'income', 'expenses', 'dueDates', 'firstPayment']),
      interest: null,
      plan: null,
      rateWatch: null,
      coachMoves: [],
    }));
    expect(screen.queryAllByRole('heading')).toHaveLength(0);
    expect(screen.getByText('Nothing to show for September yet.')).toBeTruthy();
    expect(screen.getByText('Nothing to show for September yet.').closest('section')?.className).not.toContain('min-[769px]:hidden');
  });

  it('keeps the empty state for phones only when rate watch is the one card left', () => {
    renderTab(insights({
      readiness: readiness(['debts', 'income', 'expenses', 'dueDates', 'firstPayment']),
      interest: null,
      plan: null,
      coachMoves: [],
    }));
    expect(screen.getByRole('heading', { name: 'Rate watch · 1 card' })).toBeTruthy();
    const empty = screen.getByText('Nothing to show for September yet.').closest('section');
    expect(empty?.className).toContain('min-[769px]:hidden');
  });

  it('gives Pro and trial users the AI brief instead of the free move, wired like v1', () => {
    const { onNavigate, onSetPendingCoachExtra } = renderTab(insights({
      tier: PRO,
      coachMoves: [makeLogMissedMove('Sep', 1, true), makeSwitchMove('avalanche', 1030, true)],
    }));
    expect(document.querySelector('[data-stub="CoachBriefCard"]')).not.toBeNull();
    expect(screen.queryByText(/Your free move/)).toBeNull();
    expect(screen.queryByRole('button', { name: /more moves? found/ })).toBeNull();
    coachBrief.props?.onApplyAction?.(150);
    expect(onSetPendingCoachExtra).toHaveBeenCalledWith(150);
    expect(onNavigate).toHaveBeenCalledWith('intelligence');
  });

  it('opens the due-dates sheet from the readiness CTA with the debts missing a day, and tracks it', () => {
    renderTab(insights());
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 due date' }));
    const sheet = screen.getByRole('dialog', { name: 'Add due dates' });
    expect(within(sheet).getByLabelText('Visa')).toBeTruthy();
    expect(within(sheet).queryByLabelText('Car loan')).toBeNull();
    expect(track).toHaveBeenCalledWith('readiness_cta', { step: 'dueDates' });
  });

  it('sends a chip to its step without counting it as a CTA press', () => {
    const { onNavigate } = renderTab(insights());
    fireEvent.click(screen.getByRole('button', { name: /Income.*done/ }));
    expect(onNavigate).toHaveBeenCalledWith('income');
    expect(track).not.toHaveBeenCalled();
  });

  it('opens the bulk log with every active debt for the first payment', () => {
    renderTab(insights({ readiness: readiness(['debts', 'income', 'expenses', 'dueDates'], 0) }));
    fireEvent.click(screen.getByRole('button', { name: 'Log your first payment' }));
    const sheet = screen.getByRole('dialog', { name: 'Log Sep payments' });
    expect((within(sheet).getByLabelText('Amount for Visa') as HTMLInputElement).value).toBe('25.00');
    expect((within(sheet).getByLabelText('Amount for Car loan') as HTMLInputElement).value).toBe('310.00');
  });

  it('sends the first-payment CTA to Debts instead of an empty sheet when every debt is paid off', () => {
    const { onNavigate } = renderTab(
      insights({ readiness: readiness(['debts', 'income', 'expenses', 'dueDates'], 0) }),
      {},
      { debts: [makeDebt({ id: 'z', name: 'Old', balance: 0, minimumPayment: 10 })] },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Log your first payment' }));
    expect(onNavigate).toHaveBeenCalledWith('debts');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the bulk log with the missed payments from the free move', () => {
    renderTab(insights());
    fireEvent.click(screen.getByRole('button', { name: 'Log it now' }));
    const sheet = screen.getByRole('dialog', { name: 'Log Sep payments' });
    expect((within(sheet).getByLabelText('Amount for Car loan') as HTMLInputElement).value).toBe('310.00');
    expect(within(sheet).queryByLabelText('Amount for Visa')).toBeNull();
    expect(track).toHaveBeenCalledWith('coach_move_cta', { move: 'log_missed', gated: false });
  });

  it("switches strategy with PayoffTab's save payload", () => {
    renderTab(insights({ coachMoves: [makeSwitchMove('avalanche', 1030, true)] }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Avalanche' }));
    expect(saveIncome.mutate).toHaveBeenCalledWith(
      { monthlyTakeHome: 4_000, essentialExpenses: 2_000, extraPayment: 0, payoffMethod: 'avalanche', accelerationAmount: null },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('does not mutate or track a strategy switch when income has not loaded yet', () => {
    renderTab(
      insights({ coachMoves: [makeSwitchMove('avalanche', 1030, true)] }),
      {},
      { income: undefined },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Avalanche' }));
    expect(saveIncome.mutate).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it('shows an alert when the strategy switch fails', () => {
    saveIncome.mutate.mockImplementationOnce((_vars: unknown, opts: { onError: (err: unknown) => void }) => opts.onError(new Error('boom')));
    renderTab(insights({ coachMoves: [makeSwitchMove('avalanche', 1030, true)] }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Avalanche' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('opens the upgrade modal with the coach copy from the more-moves row', () => {
    const seen: string[] = [];
    const unsubscribe = upgradeEvents.subscribe((feature) => seen.push(feature));
    renderTab(insights());
    fireEvent.click(screen.getByRole('button', { name: '2 more moves found — Pro' }));
    expect(seen).toEqual(['Coach moves']);
    unsubscribe();
  });

  it('shows skeleton cards while insights load', () => {
    renderTab(undefined);
    expect(screen.getByRole('status', { name: 'Loading this month' })).toBeTruthy();
  });

  it('offers a retry when insights fail', () => {
    const refetch = vi.fn();
    renderTab(undefined, { isError: true, refetch });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
