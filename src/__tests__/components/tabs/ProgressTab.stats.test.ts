// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { useAllSnapshots } from '@/lib/hooks';
import ProgressTab from '@/components/tabs/ProgressTab';
import { makeDebt, makeIncome } from '../../lib/dashboard/fixtures';

const { stub } = vi.hoisted(() => ({
  stub: (name: string) => async () => {
    const { createElement: h } = await import('react');
    return { default: () => h('div', { 'data-stub': name }) };
  },
}));

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useAllSnapshots: vi.fn(),
}));
vi.mock('@/components/progress/DataInsights', stub('DataInsights'));
vi.mock('@/components/tabs/JourneyTab', stub('JourneyTab'));
// Every name ProgressTab imports from recharts (ProgressTab.tsx:9-23) as an inert stub.
vi.mock('recharts', async () => {
  const { createElement: h } = await import('react');
  const Stub = () => h('div', { 'data-stub': 'recharts' });
  return { ResponsiveContainer: Stub, LineChart: Stub, Line: Stub, XAxis: Stub, YAxis: Stub, CartesianGrid: Stub, Tooltip: Stub };
});

const DEBTS = [makeDebt({ id: 'visa', name: 'Visa', balance: 900, originalBalance: 1_000, minimumPayment: 25 })];

function renderTab(showStats?: boolean, snapsLoading = false) {
  vi.mocked(useAllSnapshots).mockReturnValue(
    (snapsLoading
      ? { data: undefined, isLoading: true }
      : { data: { snapshots: [] }, isLoading: false }) as unknown as ReturnType<typeof useAllSnapshots>,
  );
  render(createElement(ProgressTab, {
    debts: DEBTS, income: makeIncome(), expenses: [], isLoading: false, onNavigate: vi.fn(),
    ...(showStats === undefined ? {} : { showStats }),
  }));
}

afterEach(() => vi.clearAllMocks());

describe('ProgressTab.showStats (dashboard v2, PR 5)', () => {
  it('renders the four stat cards by default (v1)', () => {
    renderTab();
    for (const label of ['Total Paid', 'Remaining', 'Debts Closed', 'Tracking Streak']) {
      expect(screen.getByText(label), label).toBeTruthy();
    }
    expect(screen.getByText('Milestones')).toBeTruthy();
  });

  it('drops the stat cards with showStats false and keeps everything else', () => {
    renderTab(false);
    for (const label of ['Total Paid', 'Remaining', 'Debts Closed', 'Tracking Streak']) {
      expect(screen.queryByText(label), label).toBeNull();
    }
    expect(screen.getByText('Milestones')).toBeTruthy();
    expect(document.querySelector('[data-stub="DataInsights"]')).not.toBeNull();
    expect(document.querySelector('[data-stub="JourneyTab"]')).not.toBeNull();
  });

  it('shows the stat skeleton grid while loading by default (v1)', () => {
    renderTab(undefined, true);
    expect(document.querySelector('.grid.grid-cols-2')?.children.length).toBe(4);
  });

  it('hides the stat skeleton grid while loading under v2, but keeps the chart skeleton', () => {
    renderTab(false, true);
    expect(document.querySelector('.grid.grid-cols-2')).toBeNull();
    expect(document.querySelector('.h-64')).not.toBeNull();
  });
});
