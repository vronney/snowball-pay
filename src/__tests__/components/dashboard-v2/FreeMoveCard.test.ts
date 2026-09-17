// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CoachMove } from '@/lib/dashboard/types';
import { freeMoveView, type FreeMoveView } from '@/lib/dashboard/thisMonth';
import FreeMoveCard from '@/components/dashboard-v2/this-month/FreeMoveCard';
import { makeCallAprMove, makeLogMissedMove, makeSwitchMove } from '../../lib/dashboard/fixtures';

const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };

function viewFor(moves: CoachMove[]): FreeMoveView {
  const view = freeMoveView({ tier: FREE, coachMoves: moves, asOf: { year: 2026, month: 8, day: 14 } });
  if (!view) throw new Error('expected a free move');
  return view;
}

function renderCard(view: FreeMoveView, extra: { pending?: boolean; error?: string | null } = {}) {
  const onAction = vi.fn();
  const onMoreMoves = vi.fn();
  render(createElement(FreeMoveCard, { view, onAction, onMoreMoves, ...extra }));
  return { onAction, onMoreMoves };
}

describe('FreeMoveCard', () => {
  it('shows the free move in full: eyebrow, priority, title, body and CTA', () => {
    const view = viewFor([makeLogMissedMove('Sep', 6)]);
    const { onAction } = renderCard(view);
    expect(screen.getByText('Your free move · Sep').className).toContain('text-action');
    expect(screen.getByText('High')).toBeTruthy();
    expect(screen.getByRole('heading', { name: view.copy.title })).toBeTruthy();
    expect(screen.getByText(view.copy.body)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Log them now' }));
    expect(onAction).toHaveBeenCalledWith('bulk_log');
  });

  it('shows the gated count as a Pro row that opens the upgrade modal', () => {
    const { onMoreMoves } = renderCard(viewFor([
      makeLogMissedMove('Sep', 2), makeSwitchMove('avalanche', 1030), makeCallAprMove('c1', 742),
    ]));
    const row = screen.getByRole('button', { name: '2 more moves found — Pro' });
    expect(row.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(row);
    expect(onMoreMoves).toHaveBeenCalledTimes(1);
  });

  it('has no button for the APR call, and no row when nothing else is gated', () => {
    renderCard(viewFor([makeCallAprMove('c1', 742, true)]));
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('shows a running strategy switch and its error', () => {
    renderCard(viewFor([makeSwitchMove('avalanche', 1030, true)]), { pending: true, error: "Couldn't switch. Try again." });
    expect((screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe("Couldn't switch. Try again.");
  });

  it('drops the priority chip on Coach (showPriority false)', () => {
    const view = viewFor([makeLogMissedMove('Sep', 2)]);
    render(createElement(FreeMoveCard, { view, showPriority: false, onAction: vi.fn(), onMoreMoves: vi.fn() }));
    expect(screen.queryByText('High')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Log the 2 missing payments for Sep.' })).toBeTruthy();
  });
});
