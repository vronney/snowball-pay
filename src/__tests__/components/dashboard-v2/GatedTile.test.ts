// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { upgradeEvents } from '@/lib/upgradeEvents';
import GatedTile from '@/components/dashboard-v2/GatedTile';

describe('GatedTile (spec §8.3; README "The System" rule 1)', () => {
  it('is a focusable, visibly disabled control named "{label} — Pro" that opens the upgrade modal', () => {
    const handler = vi.fn();
    const unsubscribe = upgradeEvents.subscribe(handler);
    const onOpen = vi.fn();
    render(createElement(GatedTile, { label: '+$100', feature: 'What-if scenarios', onOpen }));
    const tile = screen.getByRole('button', { name: '+$100 — Pro' });
    expect(tile.getAttribute('aria-disabled')).toBe('true');
    expect(tile.hasAttribute('disabled')).toBe(false);
    expect(tile.textContent).toContain('Pro');
    fireEvent.click(tile);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('What-if scenarios');
    unsubscribe();
  });
});
