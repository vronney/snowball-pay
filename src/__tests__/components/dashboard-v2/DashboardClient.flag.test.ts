// src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DashboardClient from '@/components/DashboardClient';
import { useDashboardInsights, useDebts } from '@/lib/hooks';
import ToastNotifications from '@/components/ToastNotifications';
import { makeDebt } from '../../lib/dashboard/fixtures';

const { stub, nav } = vi.hoisted(() => ({
  stub: (name: string, named?: string) => async () => {
    const { createElement: h } = await import('react');
    const Stub = () => h('div', { 'data-stub': name });
    return named ? { [named]: Stub } : { default: Stub };
  },
  nav: { params: new URLSearchParams() },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => nav.params,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('next/image', async () => {
  const { createElement: h } = await import('react');
  return { default: (p: { src: string; alt: string }) => h('img', { src: p.src, alt: p.alt }) };
});
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useDebts: vi.fn(() => ({ data: { debts: [] }, isLoading: false, isFetching: false, isError: false })),
  useIncome: () => ({ data: { income: null }, isLoading: false, isFetching: false, isError: false }),
  useExpenses: () => ({ data: { expenses: [] }, isLoading: false }),
  useUserSettings: () => ({ data: undefined }),
  usePaymentRecords: () => ({ data: { records: [] } }),
  useMarkPaid: () => ({ mutate: vi.fn() }),
  useStartCheckout: () => ({ mutate: vi.fn() }),
  useSubscription: () => ({ data: undefined }),
  useDashboardInsights: vi.fn(() => ({ data: undefined })),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
  resetIdentity: vi.fn(),
}));
vi.mock('@/lib/hooks/useIdleTimeout', () => ({
  useIdleTimeout: () => ({ warning: false, countdown: 0, stayLoggedIn: vi.fn(), logout: vi.fn() }),
}));
vi.mock('@/components/dashboard/useNotifications', () => ({ useNotifications: () => ({ notifications: [] }) }));
vi.mock('@/components/ToastNotifications', () => ({ default: vi.fn(() => null) }));
vi.mock('@/components/tabs/ThisMonthTab', stub('ThisMonthTab'));
vi.mock('@/components/tabs/DebtTab', stub('DebtTab'));
vi.mock('@/components/tabs/IncomeTab', stub('IncomeTab'));
vi.mock('@/components/tabs/PayoffTab', stub('PayoffTab'));
vi.mock('@/components/tabs/ProgressTab', stub('ProgressTab'));
vi.mock('@/components/tabs/SettingsTab', stub('SettingsTab'));
vi.mock('@/components/tabs/IntelligenceTab', stub('IntelligenceTab'));
vi.mock('@/components/dashboard-v2/this-month/ThisMonthV2', stub('ThisMonthV2'));
vi.mock('@/components/dashboard-v2/debts/DebtsV2', stub('DebtsV2'));
vi.mock('@/components/dashboard-v2/plan/PlanV2', stub('PlanV2'));
vi.mock('@/components/dashboard-v2/progress/ProgressV2', stub('ProgressV2'));
vi.mock('@/components/dashboard-v2/coach/CoachV2', stub('CoachV2'));
vi.mock('@/components/billing/UpgradeModal', stub('UpgradeModal'));
vi.mock('@/components/dashboard/TrialCountdownBanner', stub('TrialCountdownBanner'));
vi.mock('@/components/dashboard/LinkBankPrompt', stub('LinkBankPrompt'));
vi.mock('@/components/dashboard/MilestoneWidget', stub('MilestoneWidget', 'MilestoneWidget'));
vi.mock('@/components/dashboard/NotificationPanel', stub('NotificationPanel'));
vi.mock('@/components/plaid/PlaidLink', stub('PlaidLink', 'PlaidLink'));

const USER = { name: 'Test User', email: 'test@example.com', picture: null };

beforeEach(() => {
  nav.params = new URLSearchParams();
  vi.clearAllMocks();
});

describe('DashboardClient with the flag off (v1 must render unchanged, spec §5.3)', () => {
  it('renders the v1 shell', () => {
    expect(renderToStaticMarkup(createElement(DashboardClient, { user: USER }))).toMatchSnapshot();
  });

  it('renders the v1 shell with the header Link bank button', () => {
    expect(
      renderToStaticMarkup(createElement(DashboardClient, { user: USER, plaidTestAccess: true })),
    ).toMatchSnapshot();
  });
});

describe('DashboardClient flag wiring', () => {
  it('renders identical markup when the flag is explicitly off', () => {
    const implicit = renderToStaticMarkup(createElement(DashboardClient, { user: USER }));
    const explicit = renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: false }));
    expect(explicit).toBe(implicit);
  });

  it('never asks for dashboard insights with the flag off', () => {
    renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: false }));
    expect(useDashboardInsights).not.toHaveBeenCalled();
  });

  it('renders the v2 shell, with This Month v2, when the flag is on', () => {
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(html).not.toContain('db-sidebar');
    expect(html).toContain('aria-label="Dashboard sections"');
    expect(html).toContain('aria-label="Dashboard"');
    expect(html).toContain('data-stub="ThisMonthV2"');
    expect(html).not.toContain('data-stub="ThisMonthTab"');
    // Retired under the flag in PR 6: moment D carries the post-trial decision.
    expect(html).not.toContain('data-stub="TrialCountdownBanner"');
    expect(useDashboardInsights).toHaveBeenCalled();
  });

  it('lifts toasts above the bottom bar only in v2', () => {
    renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(vi.mocked(ToastNotifications).mock.calls.at(-1)?.[0]).toMatchObject({
      bottom: 'calc(24px + var(--v2-tabbar-offset, 0px))',
    });
    vi.mocked(ToastNotifications).mockClear();
    renderToStaticMarkup(createElement(DashboardClient, { user: USER }));
    expect(vi.mocked(ToastNotifications).mock.calls.at(-1)?.[0]).not.toHaveProperty('bottom');
  });

  it('renders My Debts v2 on the debts tab when the flag is on', () => {
    nav.params = new URLSearchParams('tab=debts');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(html).toContain('data-stub="DebtsV2"');
    expect(html).not.toContain('data-stub="DebtTab"');
  });

  it('keeps v1 My Debts with the flag off', () => {
    nav.params = new URLSearchParams('tab=debts');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER }));
    expect(html).toContain('data-stub="DebtTab"');
    expect(html).not.toContain('data-stub="DebtsV2"');
  });

  it('renders My Plan v2 on the plan tab when the flag is on', () => {
    nav.params = new URLSearchParams('tab=plan');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(html).toContain('data-stub="PlanV2"');
    expect(html).not.toContain('data-stub="PayoffTab"');
  });

  it('keeps v1 My Plan with the flag off', () => {
    nav.params = new URLSearchParams('tab=plan');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER }));
    expect(html).toContain('data-stub="PayoffTab"');
    expect(html).not.toContain('data-stub="PlanV2"');
  });

  it('renders Progress v2 on the progress tab when the flag is on', () => {
    nav.params = new URLSearchParams('tab=progress');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(html).toContain('data-stub="ProgressV2"');
    expect(html).not.toContain('data-stub="ProgressTab"');
  });

  it('keeps v1 Progress with the flag off', () => {
    nav.params = new URLSearchParams('tab=progress');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER }));
    expect(html).toContain('data-stub="ProgressTab"');
    expect(html).not.toContain('data-stub="ProgressV2"');
  });

  it('renders Coach v2 on the intelligence tab when the flag is on', () => {
    nav.params = new URLSearchParams('tab=intelligence');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(html).toContain('data-stub="CoachV2"');
    expect(html).not.toContain('data-stub="IntelligenceTab"');
  });

  it('keeps v1 Intelligence with the flag off', () => {
    nav.params = new URLSearchParams('tab=intelligence');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER }));
    expect(html).toContain('data-stub="IntelligenceTab"');
    expect(html).not.toContain('data-stub="CoachV2"');
  });

  it('renders v2 Progress without the legacy MilestoneWidget (C5)', () => {
    vi.mocked(useDebts).mockReturnValueOnce({
      data: { debts: [makeDebt({ id: 'visa', balance: 100, minimumPayment: 10 })] },
      isLoading: false, isFetching: false, isError: false,
    } as unknown as ReturnType<typeof useDebts>);
    nav.params = new URLSearchParams('tab=progress');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(html).not.toContain('data-stub="MilestoneWidget"');
    expect(html).toContain('data-stub="ProgressV2"');
  });

  it('keeps the legacy MilestoneWidget alongside v1 Progress with the flag off (C5)', () => {
    vi.mocked(useDebts).mockReturnValueOnce({
      data: { debts: [makeDebt({ id: 'visa', balance: 100, minimumPayment: 10 })] },
      isLoading: false, isFetching: false, isError: false,
    } as unknown as ReturnType<typeof useDebts>);
    nav.params = new URLSearchParams('tab=progress');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER }));
    expect(html).toContain('data-stub="MilestoneWidget"');
    expect(html).toContain('data-stub="ProgressTab"');
  });
});
