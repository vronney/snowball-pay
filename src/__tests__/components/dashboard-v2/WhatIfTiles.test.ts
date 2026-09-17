// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import WhatIfTiles from '@/components/dashboard-v2/plan/WhatIfTiles';

/**
 * README §3c: the free rung hides when it changes nothing (whatIfFreeTile's
 * "hide, never fake"), but the two gated tiles carry no figure to fake — they
 * must stay up regardless (controller ruling, final-review finding 6).
 */
describe('WhatIfTiles (README §3c)', () => {
  it('keeps both gated tiles, without the free rung, when there is nothing to show', () => {
    render(createElement(WhatIfTiles, { tile: null }));
    expect(screen.getByRole('button', { name: '+$100 — Pro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Any $ — Pro' })).toBeTruthy();
    expect(screen.queryByText('+$25/mo')).toBeNull();
  });

  it('renders the free rung alongside both gated tiles when it has a figure', () => {
    render(createElement(WhatIfTiles, { tile: { label: '+$25/mo', result: '2m sooner · saves $523' } }));
    expect(screen.getByText('+$25/mo')).toBeTruthy();
    expect(screen.getByText('2m sooner · saves $523')).toBeTruthy();
    expect(screen.getByRole('button', { name: '+$100 — Pro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Any $ — Pro' })).toBeTruthy();
  });
});
