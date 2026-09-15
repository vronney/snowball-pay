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
});
