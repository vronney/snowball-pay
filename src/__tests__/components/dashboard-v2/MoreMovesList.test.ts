// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import MoreMovesList from '@/components/dashboard-v2/coach/MoreMovesList';

const view = {
  heading: '2 more moves found',
  rows: [
    { id: 'call_apr' as const, title: 'Call Citi about its 28% APR', value: '$742/yr est.' },
    { id: 'switch_strategy' as const, title: 'Switch to Avalanche — $1,030 less interest.', value: '$1,030' },
  ],
};

describe('MoreMovesList (README §5c)', () => {
  it('shows every title and value, and its header is the gated control', () => {
    const onOpen = vi.fn();
    render(createElement(MoreMovesList, { view, onOpen }));
    const header = screen.getByRole('button', { name: '2 more moves found — Pro' });
    expect(header.getAttribute('aria-disabled')).toBe('true');
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'Call Citi about its 28% APR$742/yr est.',
      'Switch to Avalanche — $1,030 less interest.$1,030',
    ]);
    fireEvent.click(header);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(document.body.innerHTML).not.toContain('blur');
  });
});
