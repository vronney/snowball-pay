// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import FocusDebtCard from '@/components/dashboard-v2/debts/FocusDebtCard';

const VIEW = {
  debtId: 'a', name: 'Visa', balance: '$1,000.50', apr: '28.74% APR',
  amount: 565, amountLabel: '$565.00', goneIn: '3m',
};

describe('FocusDebtCard', () => {
  it('shows the focus debt and what to pay here this month', () => {
    render(createElement(FocusDebtCard, { view: VIEW, pending: false, onLog: vi.fn() }));
    const card = screen.getByRole('region', { name: 'Visa' });
    expect(within(card).getByText('Focus')).toBeTruthy();
    expect(within(card).getByText('$1,000.50')).toBeTruthy();
    expect(within(card).getByText('28.74% APR')).toBeTruthy();
    expect(card.textContent).toContain('Pay $565.00 here this month · gone in 3m');
  });

  it('logs the planned payment from its CTA', () => {
    const onLog = vi.fn();
    render(createElement(FocusDebtCard, { view: VIEW, pending: false, onLog }));
    fireEvent.click(screen.getByRole('button', { name: 'Log payment' }));
    expect(onLog).toHaveBeenCalledTimes(1);
  });

  it('holds its CTA while saving', () => {
    render(createElement(FocusDebtCard, { view: VIEW, pending: true, onLog: vi.fn() }));
    expect((screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('drops the payoff clause without a schedule, and the rate at 0%', () => {
    render(createElement(FocusDebtCard, { view: { ...VIEW, apr: null, goneIn: null }, pending: false, onLog: vi.fn() }));
    const card = screen.getByRole('region', { name: 'Visa' });
    expect(card.textContent).toContain('Pay $565.00 here this month');
    expect(card.textContent).not.toContain('gone in');
    expect(within(card).queryByText(/APR/)).toBeNull();
  });
});
