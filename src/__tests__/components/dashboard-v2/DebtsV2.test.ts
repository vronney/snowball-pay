// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { DashboardInsights } from '@/lib/dashboard/types';
import {
  useAllSnapshots, useCreateDebt, useDashboardInsights, useDeleteDebt, useMarkPaid,
  usePaymentRecords, useStartCheckout, useSubscription,
} from '@/lib/hooks';
import { PLANS } from '@/lib/stripe';
import DebtsV2 from '@/components/dashboard-v2/debts/DebtsV2';
import { makeDebt, makeIncome } from '../../lib/dashboard/fixtures';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useDashboardInsights: vi.fn(),
  useSubscription: vi.fn(),
  useAllSnapshots: vi.fn(),
  usePaymentRecords: vi.fn(),
  useDeleteDebt: vi.fn(),
  useMarkPaid: vi.fn(),
  useCreateDebt: vi.fn(),
  useStartCheckout: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));
vi.mock('@/components/DebtCard', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (p: { debt: { id: string }; openPaymentPanel?: boolean }) =>
      h('div', { 'data-stub': 'DebtCard', 'data-debt': p.debt.id, 'data-open-payment': String(Boolean(p.openPaymentPanel)) }),
  };
});
vi.mock('@/components/PaymentCalendar', () => ({ default: () => null }));
vi.mock('@/components/PaymentCelebrationBanner', () => ({ default: () => null }));
vi.mock('@/components/DebtForm', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (p: { onSubmit: (data: unknown) => void }) =>
      h('button', {
        type: 'button',
        onClick: () => p.onSubmit({ name: 'Store card', category: 'Credit Card', balance: 1200, interestRate: 24.99, minimumPayment: 40 }),
      }, 'Submit form'),
  };
});

const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
const PRO = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null } };
// Surplus 4000 − 2000 − 325 = 1675, so the 200 acceleration is used in full.
const INCOME = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, accelerationAmount: 200 });
const COUNTED = [
  makeDebt({ id: 'car', name: 'Car loan', balance: 9_000, minimumPayment: 300, interestRate: 7 }),
  makeDebt({ id: 'visa', name: 'Visa', balance: 900, minimumPayment: 25, interestRate: 28 }),
];
const OUTSIDE = makeDebt({ id: 'store', name: 'Store card', balance: 1_200, minimumPayment: 35, interestRate: 26, inPlan: false });
const UNCOUNTED = { count: 1, balance: 1_200, monthsImpact: 4 };

function insights(overrides: Partial<DashboardInsights> = {}): DashboardInsights {
  return {
    asOf: { year: 2026, month: 8, day: 15 },
    tier: FREE,
    readiness: { steps: [], completeCount: 0, percent: 0 },
    interest: null,
    paymentGap: null,
    coachMoves: [],
    rateWatch: null,
    strategy: null,
    planGap: null,
    progress: null,
    plan: { method: 'snowball', months: 31, debtFreeDate: '2029-04-14', totalInterest: 5_000 },
    uncounted: null,
    ...overrides,
  };
}

function renderTab({ debts = COUNTED, data = insights(), openPaymentDebtId = null as string | null } = {}) {
  vi.mocked(useDashboardInsights).mockReturnValue({ data } as unknown as ReturnType<typeof useDashboardInsights>);
  vi.mocked(useSubscription).mockReturnValue(
    { data: { proEligible: data.tier.proEligible, plaidEligible: false } } as unknown as ReturnType<typeof useSubscription>,
  );
  vi.mocked(useAllSnapshots).mockReturnValue({ data: { snapshots: [] } } as unknown as ReturnType<typeof useAllSnapshots>);
  vi.mocked(usePaymentRecords).mockReturnValue({ data: { records: [] } } as unknown as ReturnType<typeof usePaymentRecords>);
  vi.mocked(useDeleteDebt).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteDebt>);
  const markPaid = { mutate: vi.fn() };
  vi.mocked(useMarkPaid).mockReturnValue(markPaid as unknown as ReturnType<typeof useMarkPaid>);
  vi.mocked(useCreateDebt).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useCreateDebt>);
  vi.mocked(useStartCheckout).mockReturnValue(
    { mutate: vi.fn(), isPending: false, isError: false, error: null } as unknown as ReturnType<typeof useStartCheckout>,
  );
  render(createElement(DebtsV2, { debts, income: INCOME, expenses: [], openPaymentDebtId }));
  return { markPaid };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15, 12, 0));
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('DebtsV2 (spec §8.5 My Debts)', () => {
  it("lists the plan's debts in payoff order, with no outside-plan chrome while every debt counts", () => {
    renderTab();
    const rows = within(screen.getByRole('region', { name: 'Debts in your plan' })).getAllByRole('button');
    expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining('Visa'), expect.stringContaining('Car loan')]);
    expect(screen.queryByText(/counted$/)).toBeNull();
    expect(screen.queryByRole('region', { name: 'Saved, outside the plan' })).toBeNull();
    expect(screen.queryByText(/ignores/)).toBeNull();
  });

  it('shows the counted share, both totals and the outside section when a debt sits outside the plan', () => {
    renderTab({ debts: [...COUNTED, OUTSIDE], data: insights({ uncounted: UNCOUNTED }) });
    expect(screen.getByText('2 of 3 counted')).toBeTruthy();
    expect(screen.getByText('Counted').parentElement?.textContent).toContain('$9,900.00');
    expect(screen.getByText('Not counted').parentElement?.textContent).toContain('$1,200.00');
    const outside = screen.getByRole('region', { name: 'Saved, outside the plan' });
    expect(within(outside).getByText('Store card')).toBeTruthy();
    expect(within(outside).getByText('Not in plan')).toBeTruthy();
  });

  it('closes with what the date ignores and opens moment E from it', () => {
    renderTab({ debts: [...COUNTED, OUTSIDE], data: insights({ uncounted: UNCOUNTED }) });
    expect(screen.getByText("April 2029 ignores $1,200.00 — about 4 months it doesn't include.")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: `Count all 3 — $${PLANS.pro.price}/mo` }));
    const dialog = screen.getByRole('dialog', { name: 'Your date is built from 2 of your 3 debts.' });
    expect(within(dialog).getByText('Debt 3 of 3 · saved, not counted')).toBeTruthy();
  });

  it('shows Pro and trial accounts their outside debts, with no upgrade card', () => {
    renderTab({ debts: [...COUNTED, OUTSIDE], data: insights({ tier: PRO, uncounted: UNCOUNTED }) });
    expect(screen.getByRole('region', { name: 'Saved, outside the plan' })).toBeTruthy();
    expect(screen.queryByText(/ignores/)).toBeNull();
  });

  it("puts the month's focus debt on top and logs its planned payment as v1 This Month does", () => {
    const { markPaid } = renderTab();
    const card = screen.getByRole('region', { name: 'Visa' });
    fireEvent.click(within(card).getByRole('button', { name: 'Log payment' }));
    expect(markPaid.mutate).toHaveBeenCalledWith(
      { debtId: 'visa', amount: 225, dueYear: 2026, dueMonth: 8 },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });

  it("opens a notification's debt with its payment panel", () => {
    renderTab({ openPaymentDebtId: 'car' });
    expect(document.querySelector('[data-debt="car"]')?.getAttribute('data-open-payment')).toBe('true');
  });

  it('adds a debt in a sheet, telling a Free account at the cap first', () => {
    const five = Array.from({ length: PLANS.free.debtLimit }, (_, i) =>
      makeDebt({ id: `d${i}`, name: `Debt ${i}`, balance: 100 * (i + 1), minimumPayment: 10 }));
    renderTab({ debts: five });
    fireEvent.click(screen.getByRole('button', { name: 'Add debt' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a debt' });
    expect(within(dialog).getByText(
      `On Free, your plan counts ${PLANS.free.debtLimit} debts. This one will be saved outside it.`,
    )).toBeTruthy();
  });

  it('shows no outside-plan notice while insights and subscription are both still loading', () => {
    // Neither query has resolved yet (data: undefined). proEligible must stay
    // undefined rather than defaulting to Free, or a Pro account briefly sees
    // the Free "saved outside it" notice while loading.
    const five = Array.from({ length: PLANS.free.debtLimit }, (_, i) =>
      makeDebt({ id: `d${i}`, name: `Debt ${i}`, balance: 100 * (i + 1), minimumPayment: 10 }));
    vi.mocked(useDashboardInsights).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useDashboardInsights>);
    vi.mocked(useSubscription).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useSubscription>);
    vi.mocked(useAllSnapshots).mockReturnValue({ data: { snapshots: [] } } as unknown as ReturnType<typeof useAllSnapshots>);
    vi.mocked(usePaymentRecords).mockReturnValue({ data: { records: [] } } as unknown as ReturnType<typeof usePaymentRecords>);
    vi.mocked(useDeleteDebt).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteDebt>);
    vi.mocked(useMarkPaid).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useMarkPaid>);
    vi.mocked(useCreateDebt).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useCreateDebt>);
    vi.mocked(useStartCheckout).mockReturnValue(
      { mutate: vi.fn(), isPending: false, isError: false, error: null } as unknown as ReturnType<typeof useStartCheckout>,
    );

    render(createElement(DebtsV2, { debts: five, income: INCOME, expenses: [], openPaymentDebtId: null }));
    fireEvent.click(screen.getByRole('button', { name: 'Add debt' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a debt' });
    expect(within(dialog).queryByText(/saved outside it/)).toBeNull();
  });

  it('hides the focus card when the focus debt costs nothing this month', () => {
    // Zero minimum payment and no acceleration (income.accelerationAmount: 0)
    // makes focusCardView's amount exactly 0 — the card must hide instead of
    // showing a fake "Pay $0.00 here this month" prompt.
    const debt = makeDebt({ id: 'zero', name: 'Zero-minimum debt', balance: 500, minimumPayment: 0 });
    const income = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, accelerationAmount: 0 });
    vi.mocked(useDashboardInsights).mockReturnValue({ data: insights() } as unknown as ReturnType<typeof useDashboardInsights>);
    vi.mocked(useSubscription).mockReturnValue(
      { data: { proEligible: false, plaidEligible: false } } as unknown as ReturnType<typeof useSubscription>,
    );
    vi.mocked(useAllSnapshots).mockReturnValue({ data: { snapshots: [] } } as unknown as ReturnType<typeof useAllSnapshots>);
    vi.mocked(usePaymentRecords).mockReturnValue({ data: { records: [] } } as unknown as ReturnType<typeof usePaymentRecords>);
    vi.mocked(useDeleteDebt).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteDebt>);
    vi.mocked(useMarkPaid).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useMarkPaid>);
    vi.mocked(useCreateDebt).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useCreateDebt>);
    vi.mocked(useStartCheckout).mockReturnValue(
      { mutate: vi.fn(), isPending: false, isError: false, error: null } as unknown as ReturnType<typeof useStartCheckout>,
    );

    render(createElement(DebtsV2, { debts: [debt], income, expenses: [], openPaymentDebtId: null }));
    expect(screen.queryByRole('button', { name: 'Log payment' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Zero-minimum debt' })).toBeNull();
  });

  it('starts an empty account with one add button', () => {
    renderTab({ debts: [] });
    expect(screen.getByText('No debts yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add your first debt' }));
    expect(screen.getByRole('dialog', { name: 'Add a debt' })).toBeTruthy();
  });

  it('never saves outside the plan unannounced: submits allowOutsidePlan: false while the tier is unknown', async () => {
    vi.mocked(useDashboardInsights).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useDashboardInsights>);
    vi.mocked(useSubscription).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useSubscription>);
    vi.mocked(useAllSnapshots).mockReturnValue({ data: { snapshots: [] } } as unknown as ReturnType<typeof useAllSnapshots>);
    vi.mocked(usePaymentRecords).mockReturnValue({ data: { records: [] } } as unknown as ReturnType<typeof usePaymentRecords>);
    vi.mocked(useDeleteDebt).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteDebt>);
    vi.mocked(useMarkPaid).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useMarkPaid>);
    const mutateAsync = vi.fn().mockResolvedValue({ debt: { id: 'd1' } });
    vi.mocked(useCreateDebt).mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useCreateDebt>);
    vi.mocked(useStartCheckout).mockReturnValue(
      { mutate: vi.fn(), isPending: false, isError: false, error: null } as unknown as ReturnType<typeof useStartCheckout>,
    );

    render(createElement(DebtsV2, { debts: COUNTED, income: INCOME, expenses: [], openPaymentDebtId: null }));
    fireEvent.click(screen.getByRole('button', { name: 'Add debt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ allowOutsidePlan: false }));
  });

  // Round 6 (Codex r4) P2-a: allowOutsidePlan ties to the warning actually
  // shown (notice !== null), not merely to the tier being resolved — see
  // src/lib/dashboard/myDebts.ts outsidePlanNotice for when notice is non-null.
  it('submits allowOutsidePlan: false for a Free account below the cap (no warning shown)', async () => {
    // COUNTED has 2 debts; PLANS.free.debtLimit is 5, so this account is below the cap.
    renderTab({ debts: COUNTED, data: insights({ tier: FREE }) });
    const mutateAsync = vi.fn().mockResolvedValue({ debt: { id: 'd1' } });
    vi.mocked(useCreateDebt).mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useCreateDebt>);

    fireEvent.click(screen.getByRole('button', { name: 'Add debt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ allowOutsidePlan: false }));
  });

  it('submits allowOutsidePlan: true for a Free account at the cap (warning shown)', async () => {
    const atCap = [
      makeDebt({ id: 'd1', name: 'Debt 1', balance: 100, minimumPayment: 10, interestRate: 10 }),
      makeDebt({ id: 'd2', name: 'Debt 2', balance: 100, minimumPayment: 10, interestRate: 10 }),
      makeDebt({ id: 'd3', name: 'Debt 3', balance: 100, minimumPayment: 10, interestRate: 10 }),
      makeDebt({ id: 'd4', name: 'Debt 4', balance: 100, minimumPayment: 10, interestRate: 10 }),
      makeDebt({ id: 'd5', name: 'Debt 5', balance: 100, minimumPayment: 10, interestRate: 10 }),
    ];
    renderTab({ debts: atCap, data: insights({ tier: FREE }) });
    const mutateAsync = vi.fn().mockResolvedValue({ debt: { id: 'd1' } });
    vi.mocked(useCreateDebt).mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useCreateDebt>);

    fireEvent.click(screen.getByRole('button', { name: 'Add debt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ allowOutsidePlan: true }));
  });

  it('submits allowOutsidePlan: false for a Pro account (uncapped, notice always null)', async () => {
    renderTab({ debts: COUNTED, data: insights({ tier: PRO }) });
    const mutateAsync = vi.fn().mockResolvedValue({ debt: { id: 'd1' } });
    vi.mocked(useCreateDebt).mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useCreateDebt>);

    fireEvent.click(screen.getByRole('button', { name: 'Add debt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ allowOutsidePlan: false }));
  });
});
