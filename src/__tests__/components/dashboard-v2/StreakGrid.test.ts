// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { computeStreakGrid } from '@/lib/dashboard/streakGrid';
import StreakGrid from '@/components/dashboard-v2/progress/StreakGrid';

const TODAY = new Date(2026, 8, 12);
const gap = (logged: number, expected: number) => ({ expected, logged, missed: [], missedMinimums: 0, notYetDue: expected - logged });

describe('StreakGrid (README §4b; D10)', () => {
  it('renders one named cell per month with its state', () => {
    const cells = computeStreakGrid(new Set(['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08']), gap(3, 9), TODAY);
    render(createElement(StreakGrid, { cells }));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(12);
    expect(items[0].getAttribute('aria-label')).toBe('Jan 2026: before you started');
    expect(items[1].getAttribute('aria-label')).toBe('Feb 2026: logged');
    expect(items[8].getAttribute('aria-label')).toBe('Sep 2026: in progress');
    expect(items[8].className).toContain('bg-warning');
    expect(items[9].getAttribute('aria-label')).toBe('Oct 2026: upcoming');
  });

  it('draws a missed month red, completes the current month green, and never dashes anything', () => {
    const cells = computeStreakGrid(new Set(['2026-05', '2026-06', '2026-08']), gap(9, 9), TODAY);
    render(createElement(StreakGrid, { cells }));
    const items = screen.getAllByRole('listitem');
    const july = items.find((li) => li.getAttribute('data-state') === 'missed');
    expect(july?.getAttribute('aria-label')).toBe('Jul 2026: missed');
    expect(july?.className).toContain('bg-streak-miss');
    expect(items[8].getAttribute('aria-label')).toBe('Sep 2026: logged');
    expect(items[8].className).toContain('bg-success');
    expect(document.body.innerHTML).not.toContain('dashed');
  });
});
