// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ClosingCard from '@/components/dashboard-v2/ClosingCard';

describe('ClosingCard', () => {
  it('names the number and runs its one action', () => {
    const onCta = vi.fn();
    // eslint-disable-next-line react/no-children-prop -- createElement's props-object form is the only way to type `children` here; ComponentProps assertion on a childless props object fails TS2352 (children is required).
    render(createElement(ClosingCard, { cta: 'Count all 5 — $9/mo', onCta, children: 'April 2029 ignores $4,910.25.' }));
    expect(screen.getByText('April 2029 ignores $4,910.25.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Count all 5 — $9/mo' }));
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it('renders the red variant with its eyebrow, figure, ink CTA and status note', () => {
    const onCta = vi.fn();
    // eslint-disable-next-line react/no-children-prop -- createElement's props-object form is the only way to type `children` here.
    render(createElement(ClosingCard, {
      variant: 'red', eyebrow: 'Plan vs actual', figure: '$2,621.46 behind', cta: 'Fix it in one tap', onCta,
      note: 'Applied — your plan now ends April 2029.',
      children: 'Balances are $2,621.46 above where the plan expected by Sep 2026.',
    }));
    expect(screen.getByText('Plan vs actual')).toBeTruthy();
    expect(screen.getByText('$2,621.46 behind')).toBeTruthy();
    expect(screen.getByText('Balances are $2,621.46 above where the plan expected by Sep 2026.')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Applied — your plan now ends April 2029.');
    fireEvent.click(screen.getByRole('button', { name: 'Fix it in one tap' }));
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it('renders the red variant without a CTA when there is nothing to do', () => {
    // eslint-disable-next-line react/no-children-prop -- see above.
    render(createElement(ClosingCard, { variant: 'red', figure: '$10.00 behind', children: 'Balances are $10.00 above where the plan expected by Sep 2026.' }));
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
