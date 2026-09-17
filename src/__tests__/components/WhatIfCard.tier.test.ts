// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { calculatePlanMetrics } from '@/lib/payoffPlan';
import WhatIfCard from '@/components/payoff/WhatIfCard';
import { makeDebt, makeIncome } from '../lib/dashboard/fixtures';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useSubscription: vi.fn(() => ({ data: { proEligible: false } })),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));

const INCOME = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, payoffMethod: 'snowball', accelerationAmount: 500 });
const DEBTS = [
  makeDebt({ id: 'visa', name: 'Visa', balance: 3_000, minimumPayment: 90, interestRate: 7 }),
  makeDebt({ id: 'car', name: 'Car loan', balance: 9_000, minimumPayment: 250, interestRate: 24 }),
];
const METRICS = calculatePlanMetrics(DEBTS, INCOME, [], { method: 'snowball', accelerationAmount: 500 })!;

function renderCard(props: Partial<{ isPro: boolean }> = {}) {
  render(
    createElement(WhatIfCard, {
      debts: DEBTS,
      income: INCOME,
      expenses: [],
      adjustedExtra: METRICS.adjustedExtra,
      currentMonths: METRICS.result.months,
      currentInterestPaid: METRICS.result.totalInterestPaid,
      payoffMethod: 'snowball',
      effectiveAcceleration: METRICS.effectiveAcceleration,
      availableCashFlow: METRICS.availableCashFlow,
      onAccelerationChange: vi.fn(),
      ...props,
    }),
  );
}

describe('WhatIfCard tier resolution (PR 5 finding: one tier verdict across the Plan what-if row)', () => {
  it('without an isPro prop, falls back to the Free subscription query', () => {
    renderCard();
    expect(screen.getByText('Free preview')).toBeTruthy();
    expect(screen.queryByText('Current plan')).toBeNull();
  });

  it('with isPro=true, the prop overrides a stale Free subscription cache', () => {
    renderCard({ isPro: true });
    expect(screen.getByText('Current plan')).toBeTruthy();
    expect(screen.queryByText('Free preview')).toBeNull();
  });
});
