// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { DashboardInsights } from '@/lib/dashboard/types';
import { computeStreakGrid } from '@/lib/dashboard/streakGrid';
import { useAllSnapshots, useDashboardInsights, useMarkPaid, usePaymentRecords } from '@/lib/hooks';
import ProgressV2 from '@/components/dashboard-v2/progress/ProgressV2';
import { makeDebt, makeIncome, makeSnapshot } from '../../lib/dashboard/fixtures';

const tabProps = vi.hoisted(() => ({ last: null as null | Record<string, unknown> }));

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useDashboardInsights: vi.fn(),
  useAllSnapshots: vi.fn(),
  usePaymentRecords: vi.fn(),
  useMarkPaid: vi.fn(),
}));
// v1 is covered by ProgressTab.stats.test.ts; here it only records its props.
vi.mock('@/components/tabs/ProgressTab', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (p: Record<string, unknown>) => {
      tabProps.last = p;
      return h('div', { 'data-stub': 'ProgressTab' });
    },
  };
});

const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
const TODAY = new Date(2026, 8, 15, 12, 0);
const INCOME = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, accelerationAmount: 200 });
const DEBTS = [
  makeDebt({ id: 'caraway', name: 'Caraway', balance: 0, minimumPayment: 0 }),
  makeDebt({ id: 'visa', name: 'Visa', balance: 400, originalBalance: 1_000, minimumPayment: 25, interestRate: 24 }),
  makeDebt({ id: 'car', name: 'Car loan', balance: 9_000, minimumPayment: 300, interestRate: 7 }),
];
const SNAPSHOTS = [makeSnapshot('caraway', '2026-02', 120), makeSnapshot('caraway', '2026-03', 0), makeSnapshot('visa', '2026-08', 450)];
const GAP = { expected: 2, logged: 0, missed: [{ debtId: 'visa', minimumPayment: 25 }], missedMinimums: 25, notYetDue: 1 };

function insights(overrides: Partial<DashboardInsights> = {}): DashboardInsights {
  return {
    asOf: { year: 2026, month: 8, day: 15 },
    tier: FREE,
    readiness: { steps: [], completeCount: 0, percent: 0 },
    interest: null,
    paymentGap: GAP,
    coachMoves: [],
    rateWatch: null,
    strategy: null,
    planGap: null,
    progress: {
      paidToDate: 600, startingTotal: 10_000, streak: 7,
      grid: computeStreakGrid(new Set(['2026-02', '2026-03', '2026-08']), GAP, TODAY),
    },
    plan: null,
    uncounted: null,
    ...overrides,
  };
}

type Options = { data?: DashboardInsights | undefined; records?: Array<{ debtId: string }>; placeholder?: boolean };

function renderTab(options: Options = {}) {
  const data = 'data' in options ? options.data : insights();
  vi.mocked(useDashboardInsights).mockReturnValue(
    { data, isPlaceholderData: options.placeholder ?? false } as unknown as ReturnType<typeof useDashboardInsights>,
  );
  vi.mocked(useAllSnapshots).mockReturnValue({ data: { snapshots: SNAPSHOTS } } as unknown as ReturnType<typeof useAllSnapshots>);
  vi.mocked(usePaymentRecords).mockReturnValue({ data: { records: options.records ?? [] } } as unknown as ReturnType<typeof usePaymentRecords>);
  vi.mocked(useMarkPaid).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useMarkPaid>);
  render(createElement(ProgressV2, { debts: DEBTS, income: INCOME, expenses: [], isLoading: false, onNavigate: vi.fn() }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('ProgressV2 (spec §8.5 Progress)', () => {
  it('renders the pill, the paid-off bar, the grid, the caption and the milestones, then v1 without its stat cards', () => {
    renderTab();
    expect(screen.getByText('7-month streak')).toBeTruthy();
    expect(screen.getByText('Paid off since you started')).toBeTruthy();
    expect(screen.getByText('$600.00')).toBeTruthy();
    expect(screen.getByText('of $10,000.00')).toBeTruthy();
    expect(within(screen.getByRole('list', { name: 'Payment months' })).getAllByRole('listitem')).toHaveLength(12);
    expect(screen.getByText('2 of 2 September payments still unlogged.')).toBeTruthy();
    expect(screen.getByText('Caraway paid off')).toBeTruthy();
    expect(screen.getByText('Mar 2026')).toBeTruthy();
    expect(screen.getByText('Next payoff · Visa')).toBeTruthy();
    expect(screen.getByText(/^in \d+m$/)).toBeTruthy();
    expect(document.querySelector('[data-stub="ProgressTab"]')).not.toBeNull();
    expect(tabProps.last?.showStats).toBe(false);
    expect(document.body.innerHTML).not.toContain('dashed');
    expect(usePaymentRecords).toHaveBeenLastCalledWith(2026, 8);
  });

  it("queries payment records for the month insights was computed for, not the browser's current month", () => {
    // The fake clock is still September (month 8); insights names August (month 7).
    renderTab({ data: insights({ asOf: { year: 2026, month: 7, day: 31 } }) });
    expect(usePaymentRecords).toHaveBeenLastCalledWith(2026, 7);
  });

  it('"Keep the streak" opens the log sheet with every unlogged active debt at its minimum', () => {
    renderTab({ records: [{ debtId: 'car' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Keep the streak — log 2' }));
    const dialog = screen.getByRole('dialog', { name: 'Log Sep payments' });
    expect(within(dialog).getByText('Visa')).toBeTruthy();
    expect(within(dialog).queryByText('Car loan')).toBeNull();
    expect(within(dialog).queryByText('Caraway')).toBeNull();
  });

  it('hides the caption and CTA once everything is logged', () => {
    renderTab({ data: insights({ paymentGap: { expected: 2, logged: 2, missed: [], missedMinimums: 0, notYetDue: 0 } }) });
    expect(screen.queryByText(/still unlogged/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Keep the streak/ })).toBeNull();
  });

  it('never opens the sheet on placeholder-day data', () => {
    renderTab({ placeholder: true });
    fireEvent.click(screen.getByRole('button', { name: 'Keep the streak — log 2' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders only v1 while insights are missing or carry no progress', () => {
    renderTab({ data: insights({ progress: null }) });
    expect(screen.queryByText(/streak$/)).toBeNull();
    expect(screen.queryByText('Paid off since you started')).toBeNull();
    expect(screen.queryByRole('list', { name: 'Payment months' })).toBeNull();
    expect(document.querySelector('[data-stub="ProgressTab"]')).not.toBeNull();
  });
});
