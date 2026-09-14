// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { Tab } from '@/components/dashboard/types';
import NotificationPanel from '@/components/dashboard/NotificationPanel';
import V2Header from '@/components/dashboard-v2/shell/V2Header';
import { V2_TAB_LABELS } from '@/components/dashboard-v2/shell/navItems';

vi.mock('next/image', async () => {
  const { createElement: h } = await import('react');
  return { default: (p: { src: string; alt: string }) => h('img', { src: p.src, alt: p.alt }) };
});
vi.mock('@/components/dashboard/NotificationPanel', () => ({ default: vi.fn(() => null) }));
vi.mock('@/components/plaid/PlaidLink', async () => {
  const { createElement: h } = await import('react');
  return { PlaidLink: () => h('button', { type: 'button', className: 'plaid-link-btn' }, 'Link bank') };
});
vi.mock('@/lib/logout-client', () => ({ LOGOUT_URL: '/auth/logout', runLogoutClientCleanup: vi.fn() }));

function renderHeader(overrides: { activeTab?: Tab; plaidEnabled?: boolean } = {}) {
  render(createElement(V2Header, {
    activeTab: overrides.activeTab ?? 'this-month',
    onSelectTab: vi.fn(),
    notifications: [],
    onNavigate: vi.fn(),
    onMarkPaid: vi.fn(),
    user: { name: 'Test User', email: 't@example.com', picture: null },
    initials: 'TE',
    plaidEnabled: overrides.plaidEnabled ?? false,
  }));
}

describe('V2Header', () => {
  it('titles the page with the v2 label (Coach, not Intelligence)', () => {
    renderHeader({ activeTab: 'intelligence' });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Coach');
  });

  it('shows Link bank only when bank sync is available', () => {
    renderHeader({ plaidEnabled: false });
    expect(screen.queryByRole('button', { name: 'Link bank' })).toBeNull();
  });

  it('keeps Link bank for users who can link', () => {
    renderHeader({ plaidEnabled: true });
    expect(screen.getByRole('button', { name: 'Link bank' })).toBeTruthy();
  });

  it('gives the notification panel the v2 labels', () => {
    renderHeader();
    expect(vi.mocked(NotificationPanel).mock.calls[0][0].tabLabels).toBe(V2_TAB_LABELS);
  });

  it('carries the account menu', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: 'Account menu' })).toBeTruthy();
  });

  it('gives the bell and Link bank 44px targets on mobile', () => {
    renderHeader({ plaidEnabled: true });
    const actions = screen.getByRole('button', { name: 'Account menu' }).closest('header > div:last-child');
    const classes = actions?.className.split(/\s+/) ?? [];
    for (const target of ["[&_button[aria-label='Notifications']]", '[&_.plaid-link-btn]']) {
      expect(classes).toContain(`max-[768px]:${target}:min-h-11`);
      expect(classes).toContain(`max-[768px]:${target}:min-w-11`);
    }
  });
});
