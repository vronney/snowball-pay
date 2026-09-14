// src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DashboardClient from '@/components/DashboardClient';
import { useDashboardInsights } from '@/lib/hooks';
import ToastNotifications from '@/components/ToastNotifications';

const { stub } = vi.hoisted(() => ({
  stub: (name: string, named?: string) => async () => {
    const { createElement: h } = await import('react');
    const Stub = () => h('div', { 'data-stub': name });
    return named ? { [named]: Stub } : { default: Stub };
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
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
  useDebts: () => ({ data: { debts: [] }, isLoading: false, isFetching: false, isError: false }),
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
vi.mock('@/components/billing/UpgradeModal', stub('UpgradeModal'));
vi.mock('@/components/dashboard/TrialCountdownBanner', stub('TrialCountdownBanner'));
vi.mock('@/components/dashboard/LinkBankPrompt', stub('LinkBankPrompt'));
vi.mock('@/components/dashboard/MilestoneWidget', stub('MilestoneWidget', 'MilestoneWidget'));
vi.mock('@/components/dashboard/NotificationPanel', stub('NotificationPanel'));
vi.mock('@/components/plaid/PlaidLink', stub('PlaidLink', 'PlaidLink'));

const USER = { name: 'Test User', email: 'test@example.com', picture: null };

beforeEach(() => {
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

  it('renders the v2 shell around the same tab content with the flag on', () => {
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(html).not.toContain('db-sidebar');
    expect(html).toContain('aria-label="Dashboard sections"');
    expect(html).toContain('aria-label="Dashboard"');
    expect(html).toContain('data-stub="ThisMonthTab"');
    expect(html).toContain('data-stub="TrialCountdownBanner"');
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
});
