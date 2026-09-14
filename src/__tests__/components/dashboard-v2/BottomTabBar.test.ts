// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import BottomTabBar from '@/components/dashboard-v2/shell/BottomTabBar';
import { V2_TAB_LABELS } from '@/components/dashboard-v2/shell/navItems';

function renderBar(props: Partial<Parameters<typeof BottomTabBar>[0]> = {}) {
  const onSelectTab = vi.fn();
  render(createElement(BottomTabBar, { activeTab: 'this-month', onSelectTab, coachDot: false, ...props }));
  return { onSelectTab, nav: screen.getByRole('navigation', { name: 'Dashboard' }) };
}

describe('BottomTabBar', () => {
  it('shows the five tabs in the design order', () => {
    const { nav } = renderBar();
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Month', 'Debts', 'Coach', 'Plan', 'Progress',
    ]);
  });

  it('marks only the active tab as current', () => {
    const { nav } = renderBar({ activeTab: 'plan' });
    const current = within(nav).getAllByRole('button').filter((b) => b.getAttribute('aria-current') === 'page');
    expect(current.map((b) => b.textContent)).toEqual(['Plan']);
  });

  it('marks nothing current on a tab the bar does not carry', () => {
    const { nav } = renderBar({ activeTab: 'settings' });
    expect(within(nav).getAllByRole('button').some((b) => b.hasAttribute('aria-current'))).toBe(false);
  });

  it('selects Coach by its unchanged id', () => {
    const { onSelectTab } = renderBar();
    fireEvent.click(screen.getByRole('button', { name: 'Coach' }));
    expect(onSelectTab).toHaveBeenCalledWith('intelligence');
  });

  it('shows the Coach dot with a text equivalent only when asked', () => {
    renderBar({ coachDot: true });
    expect(screen.getByRole('button', { name: 'Coach, new moves' })).toBeTruthy();
  });

  it('renames Intelligence to Coach in the v2 labels only', () => {
    expect(V2_TAB_LABELS.intelligence).toBe('Coach');
    expect(V2_TAB_LABELS.income).toBe('Income & Budget');
  });
});
