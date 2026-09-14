// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Tab } from '@/components/dashboard/types';
import type { DashboardInsights } from '@/lib/dashboard/types';
import { useDashboardInsights } from '@/lib/hooks';
import { upgradeEvents } from '@/lib/upgradeEvents';
import V2Shell from '@/components/dashboard-v2/shell/V2Shell';
import { makeCallAprMove, makeLogMissedMove } from '../../lib/dashboard/fixtures';

vi.mock('@/lib/hooks', () => ({ useDashboardInsights: vi.fn() }));
vi.mock('next/image', async () => {
  const { createElement: h } = await import('react');
  return { default: (p: { src: string; alt: string }) => h('img', { src: p.src, alt: p.alt }) };
});
vi.mock('@/components/dashboard/NotificationPanel', () => ({ default: () => null }));
vi.mock('@/components/plaid/PlaidLink', () => ({ PlaidLink: () => null }));
vi.mock('@/lib/logout-client', () => ({ LOGOUT_URL: '/auth/logout', runLogoutClientCleanup: vi.fn() }));

function insights(overrides: Partial<DashboardInsights> = {}): DashboardInsights {
  return {
    asOf: { year: 2026, month: 8, day: 14 },
    tier: { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } },
    readiness: { steps: [], completeCount: 0, percent: 0 },
    interest: null,
    paymentGap: null,
    coachMoves: [],
    rateWatch: null,
    strategy: null,
    planGap: null,
    progress: null,
    plan: null,
    ...overrides,
  };
}

const MOVES = [makeLogMissedMove('Sep', 2), makeCallAprMove('c1', 742.9)];

function renderShell(activeTab: Tab, data: DashboardInsights | undefined) {
  vi.mocked(useDashboardInsights).mockReturnValue({ data } as unknown as ReturnType<typeof useDashboardInsights>);
  const props = {
    activeTab,
    onSelectTab: vi.fn(),
    notifications: [],
    onNavigate: vi.fn(),
    onMarkPaid: vi.fn(),
    user: { name: 'Test User', email: 't@example.com', picture: null },
    initials: 'TE',
    plaidEnabled: false,
    banner: createElement('div', null, 'Trial banner'),
    children: createElement('p', null, 'Tab content'),
  };
  const view = render(createElement(V2Shell, props));
  const setTab = (tab: Tab) => view.rerender(createElement(V2Shell, { ...props, activeTab: tab }));
  return { ...view, props, setTab };
}

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('V2Shell', () => {
  it('puts the banner, then the tab content, inside the scroll area', () => {
    renderShell('this-month', insights());
    expect(screen.getByRole('main').textContent).toBe('Trial bannerTab content');
  });

  it('shows the upgrade rail for a Free user with gated moves and opens the upgrade modal', () => {
    const seen: string[] = [];
    const unsubscribe = upgradeEvents.subscribe((feature) => seen.push(feature));
    renderShell('this-month', insights({ coachMoves: MOVES }));
    expect(screen.getByText('1 move waiting')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Unlock the move' }));
    expect(seen).toEqual(['Coach moves']);
    unsubscribe();
  });

  it('shows no rail to Pro users', () => {
    renderShell('this-month', insights({
      coachMoves: MOVES.map((m) => ({ ...m, isFree: true })),
      tier: { proEligible: true, paidPro: true, trial: { active: false, endsAt: null } },
    }));
    expect(screen.queryByText(/waiting/)).toBeNull();
  });

  it('renders the full shell without insights (loading or failed): no rail, no dot', () => {
    renderShell('this-month', undefined);
    expect(screen.getByRole('navigation', { name: 'Dashboard' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Dashboard sections' })).toBeTruthy();
    expect(screen.queryByText(/waiting/)).toBeNull();
    expect(screen.queryAllByText(', new moves')).toHaveLength(0);
  });

  it('shows the Coach dot on both navs until Coach is opened', () => {
    const { setTab } = renderShell('this-month', insights({ coachMoves: MOVES }));
    expect(screen.getAllByText(', new moves')).toHaveLength(2);
    setTab('intelligence');
    expect(screen.queryAllByText(', new moves')).toHaveLength(0);
    setTab('this-month');
    expect(screen.queryAllByText(', new moves')).toHaveLength(0);
  });

  it('resets the scroll area to the top on a tab change', () => {
    const { setTab } = renderShell('this-month', insights());
    const main = screen.getByRole('main');
    Object.defineProperty(main, 'scrollTop', { value: 300, writable: true, configurable: true });
    setTab('debts');
    expect(main.scrollTop).toBe(0);
  });
});
