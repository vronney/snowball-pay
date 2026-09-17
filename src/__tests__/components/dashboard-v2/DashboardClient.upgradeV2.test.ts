// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act, render } from '@testing-library/react';
import DashboardClient from '@/components/DashboardClient';
import { useSubscription } from '@/lib/hooks';
import { upgradeEvents } from '@/lib/upgradeEvents';

const { stub, captured } = vi.hoisted(() => ({
  stub: (name: string, named?: string) => async () => {
    const { createElement: h } = await import('react');
    const Stub = () => h('div', { 'data-stub': name });
    return named ? { [named]: Stub } : { default: Stub };
  },
  captured: { thisMonth: null as null | Record<string, unknown>, coach: null as null | Record<string, unknown> },
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
  useDebts: vi.fn(() => ({ data: { debts: [] }, isLoading: false, isFetching: false, isError: false })),
  useIncome: () => ({ data: { income: null }, isLoading: false, isFetching: false, isError: false }),
  useExpenses: () => ({ data: { expenses: [] }, isLoading: false }),
  useUserSettings: () => ({ data: undefined }),
  usePaymentRecords: () => ({ data: { records: [] } }),
  useMarkPaid: () => ({ mutate: vi.fn() }),
  useStartCheckout: () => ({ mutate: vi.fn() }),
  useSubscription: vi.fn(() => ({ data: undefined })),
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
// This Month and Coach record their props, so tests can drive the callbacks DashboardClient passes.
vi.mock('@/components/dashboard-v2/this-month/ThisMonthV2', async () => {
  const { createElement: h } = await import('react');
  return { default: (p: Record<string, unknown>) => { captured.thisMonth = p; return h('div', { 'data-stub': 'ThisMonthV2' }); } };
});
vi.mock('@/components/dashboard-v2/coach/CoachV2', async () => {
  const { createElement: h } = await import('react');
  return { default: (p: Record<string, unknown>) => { captured.coach = p; return h('div', { 'data-stub': 'CoachV2' }); } };
});
vi.mock('@/components/dashboard-v2/debts/DebtsV2', stub('DebtsV2'));
vi.mock('@/components/dashboard-v2/plan/PlanV2', stub('PlanV2'));
vi.mock('@/components/dashboard-v2/progress/ProgressV2', stub('ProgressV2'));
vi.mock('@/components/dashboard-v2/upgrade/UpgradeHost', stub('UpgradeHost'));
vi.mock('@/components/billing/UpgradeModal', stub('UpgradeModal'));
vi.mock('@/components/dashboard/TrialCountdownBanner', stub('TrialCountdownBanner'));
vi.mock('@/components/dashboard/LinkBankPrompt', stub('LinkBankPrompt'));
vi.mock('@/components/dashboard/MilestoneWidget', stub('MilestoneWidget', 'MilestoneWidget'));
vi.mock('@/components/dashboard/NotificationPanel', stub('NotificationPanel'));
vi.mock('@/components/plaid/PlaidLink', stub('PlaidLink', 'PlaidLink'));

const USER = { name: 'Test User', email: 'test@example.com', picture: null };
const DAY = 24 * 60 * 60 * 1000;
const stubbed = (name: string) => document.querySelector(`[data-stub="${name}"]`);

beforeEach(() => {
  // DashboardClient's mount effects: the day-0 lifecycle ping and the tab scroll reset.
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))));
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  localStorage.clear();
  captured.thisMonth = null;
  captured.coach = null;
  vi.mocked(useSubscription).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useSubscription>);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('DashboardClient upgrade surfaces under the flag (spec §7; plan decisions 8 and 10)', () => {
  it('answers an upgrade request with UpgradeHost', () => {
    render(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    act(() => upgradeEvents.dispatch('Coach moves'));
    expect(stubbed('UpgradeHost')).not.toBeNull();
    expect(stubbed('UpgradeModal')).toBeNull();
  });

  it('keeps UpgradeModal with the flag off', () => {
    render(createElement(DashboardClient, { user: USER }));
    act(() => upgradeEvents.dispatch('Coach moves'));
    expect(stubbed('UpgradeModal')).not.toBeNull();
    expect(stubbed('UpgradeHost')).toBeNull();
  });

  it('retires the trial banner and the one-time post-trial modal', () => {
    const justEnded = {
      paidTier: 'free', subscriptionStatus: 'inactive', subscriptionEndsAt: null, isCanceling: false, hasCustomer: false,
      signupTrialActive: false, signupTrialEndsAt: new Date(Date.now() - 2 * DAY).toISOString(),
    };
    vi.mocked(useSubscription).mockReturnValue({ data: justEnded } as unknown as ReturnType<typeof useSubscription>);

    // The same account on v1 gets both, which proves the fixture triggers them.
    const v1 = render(createElement(DashboardClient, { user: USER }));
    expect(stubbed('TrialCountdownBanner')).not.toBeNull();
    expect(stubbed('UpgradeModal')).not.toBeNull();
    v1.unmount();
    localStorage.clear();

    render(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(stubbed('TrialCountdownBanner')).toBeNull();
    expect(stubbed('UpgradeModal')).toBeNull();
    expect(stubbed('UpgradeHost')).toBeNull();
  });

  it("carries moment B's APR script from This Month to Coach, then clears it (plan decision 11)", () => {
    render(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    act(() => (captured.thisMonth!.onOpenAprScript as (debtId: string) => void)('citi'));
    expect(stubbed('CoachV2')).not.toBeNull();
    expect(captured.coach).toMatchObject({ pendingAprDebtId: 'citi' });
    act(() => (captured.coach!.onConsumePendingApr as () => void)());
    expect(captured.coach).toMatchObject({ pendingAprDebtId: null });
  });
});
