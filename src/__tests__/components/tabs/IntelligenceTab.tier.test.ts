// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render } from '@testing-library/react';
import { useAllSnapshots, useSubscription } from '@/lib/hooks';
import IntelligenceTab from '@/components/tabs/IntelligenceTab';
import { makeDebt, makeIncome } from '../../lib/dashboard/fixtures';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useSubscription: vi.fn(),
  useAllSnapshots: vi.fn(),
}));
vi.mock('@/components/payoff/PlannerIntelligence', async () => {
  const { createElement: h } = await import('react');
  return { default: () => h('div', { 'data-stub': 'PlannerIntelligence' }) };
});
vi.mock('@/components/AprNegotiationCard', async () => {
  const { createElement: h } = await import('react');
  return { AprNegotiationCard: () => h('div', { 'data-stub': 'AprNegotiationCard' }) };
});
vi.mock('@/components/billing/IntelligenceUpgradeTeaser', async () => {
  const { createElement: h } = await import('react');
  return { default: () => h('div', { 'data-stub': 'IntelligenceUpgradeTeaser' }) };
});

const INCOME = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, payoffMethod: 'snowball', accelerationAmount: 200 });
const DEBTS = [makeDebt({ id: 'visa', name: 'Visa', balance: 900, minimumPayment: 25, interestRate: 24 })];

function renderTab(isPro?: boolean) {
  vi.mocked(useSubscription).mockReturnValue(
    { data: { proEligible: false }, isLoading: false, refetch: vi.fn() } as unknown as ReturnType<typeof useSubscription>,
  );
  vi.mocked(useAllSnapshots).mockReturnValue({ data: { snapshots: [] } } as unknown as ReturnType<typeof useAllSnapshots>);
  render(createElement(IntelligenceTab, {
    debts: DEBTS, income: INCOME, expenses: [], isLoading: false,
    ...(isPro === undefined ? {} : { isPro }),
  }));
}

afterEach(() => vi.clearAllMocks());

describe('IntelligenceTab isPro override (dashboard v2 Coach, PR 5)', () => {
  it('v1 (isPro omitted): a Free subscription shows the upgrade teaser, not the Pro content', () => {
    renderTab();
    expect(document.querySelector('[data-stub="IntelligenceUpgradeTeaser"]')).not.toBeNull();
    expect(document.querySelector('[data-stub="PlannerIntelligence"]')).toBeNull();
    expect(document.querySelector('[data-stub="AprNegotiationCard"]')).toBeNull();
  });

  it('isPro true overrides a stale Free subscription cache and shows the Pro content instead', () => {
    renderTab(true);
    expect(document.querySelector('[data-stub="PlannerIntelligence"]')).not.toBeNull();
    expect(document.querySelector('[data-stub="AprNegotiationCard"]')).not.toBeNull();
    expect(document.querySelector('[data-stub="IntelligenceUpgradeTeaser"]')).toBeNull();
  });
});
