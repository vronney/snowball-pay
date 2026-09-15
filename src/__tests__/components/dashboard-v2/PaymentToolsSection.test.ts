// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { upgradeEvents } from '@/lib/upgradeEvents';
import PaymentToolsSection from '@/components/dashboard-v2/debts/PaymentToolsSection';
import { makeDebt } from '../../lib/dashboard/fixtures';

vi.mock('@/components/PaymentCalendar', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (p: { focusDebtId: string | null; focusExtra: number }) =>
      h('div', { 'data-stub': 'PaymentCalendar', 'data-focus': p.focusDebtId, 'data-extra': String(p.focusExtra) }),
  };
});
vi.mock('@/lib/upgradeEvents', () => ({ upgradeEvents: { dispatch: vi.fn() } }));

// Today is the 15th: Visa is due tomorrow, the car loan in 2 days.
const DEBTS = [
  makeDebt({ id: 'a', name: 'Visa', balance: 900, minimumPayment: 25, dueDate: 16 }),
  makeDebt({ id: 'b', name: 'Car', balance: 9_000, minimumPayment: 310, dueDate: 17 }),
];

function renderSection(overrides: Record<string, unknown> = {}) {
  const onOpenDebt = vi.fn();
  render(createElement(PaymentToolsSection, {
    debts: DEBTS, paidDebtIds: new Set<string>(), focusDebtId: 'a', focusExtra: 200,
    isPro: true, subscriptionKnown: true, onOpenDebt, ...overrides,
  }));
  return { onOpenDebt, open: () => fireEvent.click(screen.getByRole('button', { name: /Payment calendar & reminders/ })) };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15, 12, 0));
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('PaymentToolsSection (spec §8.3)', () => {
  it('starts collapsed and opens on its trigger', () => {
    const { open } = renderSection();
    expect(screen.getByRole('button', { name: /Payment calendar & reminders/ }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Upcoming payments')).toBeNull();
    open();
    expect(screen.getByText('Upcoming payments')).toBeTruthy();
    const calendar = document.querySelector('[data-stub="PaymentCalendar"]');
    expect(calendar?.getAttribute('data-focus')).toBe('a');
    expect(calendar?.getAttribute('data-extra')).toBe('200');
  });

  it("opens a reminder's debt, and skips debts already paid this month", () => {
    const { onOpenDebt, open } = renderSection({ paidDebtIds: new Set(['b']) });
    open();
    expect(screen.queryByText(/Car ·/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Visa · \$25\.00/ }));
    expect(onOpenDebt).toHaveBeenCalledWith('a');
  });

  it('exports due dates for Pro', () => {
    const { open } = renderSection();
    open();
    expect(screen.getByRole('link', { name: 'Add to Calendar' }).getAttribute('href')).toBe('/api/calendar/export');
  });

  it('gives Free a gated export control (spec §8.3 GatedTile)', () => {
    const { open } = renderSection({ isPro: false });
    open();
    const gated = screen.getByRole('button', { name: 'Add to Calendar — Pro' });
    expect(gated.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(gated);
    expect(upgradeEvents.dispatch).toHaveBeenCalledWith('Export payoff plan');
  });
});
