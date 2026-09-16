// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { act, render } from '@testing-library/react';
import type { Income } from '@/types';
import { useAllSnapshots, usePaymentRecords, useSaveIncome, useUpdateDebt } from '@/lib/hooks';
import PayoffTab, { type PlanTopContext } from '@/components/tabs/PayoffTab';
import { makeDebt, makeIncome } from '../../lib/dashboard/fixtures';

const { stub } = vi.hoisted(() => ({
  stub: (name: string) => async () => {
    const { createElement: h } = await import('react');
    return { default: () => h('div', { 'data-stub': name }) };
  },
}));

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useUpdateDebt: vi.fn(),
  useSaveIncome: vi.fn(),
  useAllSnapshots: vi.fn(),
  usePaymentRecords: vi.fn(),
}));
vi.mock('@/lib/hooks/useSharePlan', () => ({ useSharePlan: () => ({ generate: vi.fn(), loading: false, copied: false }) }));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));
vi.mock('@/components/payoff/StrategySelector', stub('StrategySelector'));
vi.mock('@/components/payoff/StrategyComparison', stub('StrategyComparison'));
vi.mock('@/components/payoff/CustomPriorityEditor', stub('CustomPriorityEditor'));
vi.mock('@/components/payoff/CashFlowOverview', stub('CashFlowOverview'));
vi.mock('@/components/payoff/WhatIfCard', stub('WhatIfCard'));
vi.mock('@/components/payoff/PayoffSummary', stub('PayoffSummary'));
vi.mock('@/components/payoff/BalanceOverTimeChart', stub('BalanceOverTimeChart'));
vi.mock('@/components/payoff/PayoffTimeline', stub('PayoffTimeline'));
vi.mock('@/components/payoff/PayoffOrderList', stub('PayoffOrderList'));
vi.mock('@/components/payoff/FocusDebtExplainer', stub('FocusDebtExplainer'));
vi.mock('@/components/payoff/RollForwardAdvice', stub('RollForwardAdvice'));
vi.mock('@/components/payoff/StrategyExplanation', stub('StrategyExplanation'));
vi.mock('@/components/payoff/ReferralPrompt', stub('ReferralPrompt'));
vi.mock('@/components/AiRecommendations', stub('AiRecommendations'));
vi.mock('@/components/dashboard/ShareDebtFreeCard', stub('ShareDebtFreeCard'));

// Surplus 4000 − 2000 − 340 in minimums = 1660, so the 500 acceleration is used in full.
const INCOME = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, payoffMethod: 'snowball', accelerationAmount: 500 });
const DEBTS = [
  makeDebt({ id: 'visa', name: 'Visa', balance: 3_000, minimumPayment: 90, interestRate: 24 }),
  makeDebt({ id: 'car', name: 'Car loan', balance: 9_000, minimumPayment: 250, interestRate: 7 }),
];

type Slots = { renderTop?: (ctx: PlanTopContext) => ReactNode; renderFooter?: (ctx: PlanTopContext) => ReactNode };

function renderTab(slots: Slots = {}, income: Income = INCOME) {
  const mutate = vi.fn();
  vi.mocked(useUpdateDebt).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUpdateDebt>);
  vi.mocked(useSaveIncome).mockReturnValue({ mutate, isPending: false, isSuccess: false, isError: false, submittedAt: 0, variables: undefined } as unknown as ReturnType<typeof useSaveIncome>);
  vi.mocked(useAllSnapshots).mockReturnValue({ data: { snapshots: [] } } as unknown as ReturnType<typeof useAllSnapshots>);
  vi.mocked(usePaymentRecords).mockReturnValue({ data: { records: [] } } as unknown as ReturnType<typeof usePaymentRecords>);
  return { ...render(createElement(PayoffTab, { debts: DEBTS, income, expenses: [], isLoading: false, onNavigate: vi.fn(), ...slots })), mutate };
}

const has = (container: HTMLElement, name: string) => container.querySelector(`[data-stub="${name}"]`) !== null;

afterEach(() => vi.clearAllMocks());

describe('PayoffTab render slots (dashboard v2, PR 5)', () => {
  it('renders the v1 Strategy and Cash flow cards when no slot is given', () => {
    const { container } = renderTab();
    for (const name of ['StrategySelector', 'StrategyComparison', 'CashFlowOverview', 'WhatIfCard', 'PayoffSummary']) {
      expect(has(container, name), name).toBe(true);
    }
  });

  it('replaces those two cards with renderTop and appends renderFooter, leaving the projection in place', () => {
    const seen: PlanTopContext[] = [];
    const { container } = renderTab({
      renderTop: (ctx) => { seen.push(ctx); return createElement('div', { 'data-stub': 'v2-top' }); },
      renderFooter: () => createElement('div', { 'data-stub': 'v2-footer' }),
    });
    for (const name of ['StrategySelector', 'StrategyComparison', 'CashFlowOverview', 'WhatIfCard']) {
      expect(has(container, name), name).toBe(false);
    }
    expect(has(container, 'v2-top')).toBe(true);
    expect(has(container, 'v2-footer')).toBe(true);
    expect(has(container, 'PayoffSummary')).toBe(true);
    expect(has(container, 'CustomPriorityEditor')).toBe(false);
    const ctx = seen[seen.length - 1];
    expect(ctx.payoffMethod).toBe('snowball');
    expect(ctx.planResult.months).toBeGreaterThan(0);
    expect(ctx.alternative?.method).toBe('avalanche');
    expect(ctx.availableCashFlow).toBe(1_660);
    expect(ctx.effectiveAcceleration).toBe(500);
    expect(ctx.income).toBe(INCOME);
    expect(ctx.saveIsPending).toBe(false);
    expect(ctx.saveIsSuccess).toBe(false);
    expect(ctx.saveIsError).toBe(false);
    expect(ctx.saveSubmittedAt).toBe(0);
    expect(ctx.lastSavedAcceleration).toBeUndefined();
    expect(typeof ctx.saveAccelerationNow === 'function').toBe(true);
  });

  it('saveAccelerationNow saves at once and stops the debounced effect from saving again', () => {
    // Fake timers must be live BEFORE saveAccelerationNow runs: if the
    // lastLoadedRef guard it sets ever regressed, the debounced effect would
    // schedule a real 600ms timer immediately, and advancing fake timers
    // afterward could never run it — the test would pass without detecting
    // the duplicate save.
    vi.useFakeTimers();
    try {
      const seen: PlanTopContext[] = [];
      const { mutate } = renderTab({
        renderTop: (ctx) => { seen.push(ctx); return createElement('div', { 'data-stub': 'v2-top' }); },
      });
      const ctx = seen[seen.length - 1];

      act(() => ctx.saveAccelerationNow(900));

      expect(mutate).toHaveBeenCalledTimes(1);
      expect(mutate).toHaveBeenCalledWith({
        monthlyTakeHome: 4_000,
        essentialExpenses: 2_000,
        extraPayment: 0,
        payoffMethod: 'snowball',
        accelerationAmount: 900,
      });

      act(() => {
        vi.advanceTimersByTime(700);
      });

      expect(mutate).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the custom-order editor under the v2 top while the method is Custom', () => {
    const seen: PlanTopContext[] = [];
    const { container } = renderTab(
      { renderTop: (ctx) => { seen.push(ctx); return createElement('div', { 'data-stub': 'v2-top' }); } },
      makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, payoffMethod: 'custom', accelerationAmount: 500 }),
    );
    expect(has(container, 'v2-top')).toBe(true);
    expect(has(container, 'CustomPriorityEditor')).toBe(true);
    expect(seen[seen.length - 1].alternative).toBeNull();
  });
});
