// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import V2Sidebar from '@/components/dashboard-v2/shell/V2Sidebar';

vi.mock('next/image', async () => {
  const { createElement: h } = await import('react');
  return { default: (p: { src: string; alt: string }) => h('img', { src: p.src, alt: p.alt }) };
});

function renderSidebar(props: Partial<Parameters<typeof V2Sidebar>[0]> = {}) {
  const onSelectTab = vi.fn();
  const onUpgrade = vi.fn();
  render(createElement(V2Sidebar, {
    activeTab: 'this-month', onSelectTab, coachDot: false, rail: null, onUpgrade, ...props,
  }));
  return { onSelectTab, onUpgrade, nav: screen.getByRole('navigation', { name: 'Dashboard sections' }) };
}

describe('V2Sidebar', () => {
  it('lists the six v2 items in order, with Coach instead of Intelligence', () => {
    const { nav } = renderSidebar();
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'This Month', 'My Debts', 'Income & Budget', 'My Plan', 'Progress', 'Coach',
    ]);
  });

  it('marks the active item as current', () => {
    renderSidebar({ activeTab: 'debts' });
    expect(screen.getByRole('button', { name: 'My Debts' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'This Month' }).hasAttribute('aria-current')).toBe(false);
  });

  it('selects Coach by its unchanged id', () => {
    const { onSelectTab } = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Coach' }));
    expect(onSelectTab).toHaveBeenCalledWith('intelligence');
  });

  it('shows the Coach dot with a text equivalent only when asked', () => {
    renderSidebar({ coachDot: true });
    expect(screen.getByRole('button', { name: 'Coach, new moves' })).toBeTruthy();
  });

  it('shows the upgrade rail with its computed copy and opens the upgrade path', () => {
    const { onUpgrade } = renderSidebar({ rail: { count: 3, perYear: 1648 } });
    expect(screen.getByText('3 moves waiting')).toBeTruthy();
    expect(screen.getByText('$1,648/yr est.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Unlock all 3' }));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it('drops the value line when there is no per-year figure', () => {
    renderSidebar({ rail: { count: 1, perYear: null } });
    expect(screen.getByText('1 move waiting')).toBeTruthy();
    expect(screen.queryByText(/\/yr est\./)).toBeNull();
  });

  it('has no rail when there is nothing to unlock', () => {
    renderSidebar({ rail: null });
    expect(screen.queryByText(/waiting/)).toBeNull();
  });
});
