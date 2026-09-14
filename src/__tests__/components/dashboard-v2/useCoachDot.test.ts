// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { CoachMove } from '@/lib/dashboard/types';
import { COACH_SEEN_STORAGE_KEY } from '@/lib/dashboard/coachDot';
import { useCoachDot } from '@/components/dashboard-v2/shell/useCoachDot';
import { makeCallAprMove, makeLogMissedMove } from '../../lib/dashboard/fixtures';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

type Props = { moves: ReadonlyArray<CoachMove> | undefined; open: boolean };

describe('useCoachDot', () => {
  it('is off while moves are loading', () => {
    const { result } = renderHook(() => useCoachDot(undefined, false));
    expect(result.current).toBe(false);
  });

  it('is on for unseen moves, clears when Coach opens, and stays cleared', () => {
    const moves = [makeLogMissedMove('Sep', 2)];
    const { result, rerender } = renderHook(({ moves: m, open }: Props) => useCoachDot(m, open), {
      initialProps: { moves, open: false },
    });
    expect(result.current).toBe(true);
    rerender({ moves, open: true });
    expect(result.current).toBe(false);
    expect(localStorage.getItem(COACH_SEEN_STORAGE_KEY)).toBe('log_missed:Sep');
    rerender({ moves, open: false });
    expect(result.current).toBe(false);
  });

  it('treats a stored fingerprint as seen', () => {
    localStorage.setItem(COACH_SEEN_STORAGE_KEY, 'log_missed:Sep');
    const { result } = renderHook(() => useCoachDot([makeLogMissedMove('Sep', 4)], false));
    expect(result.current).toBe(false);
  });

  it('comes back for a new move set', () => {
    localStorage.setItem(COACH_SEEN_STORAGE_KEY, 'log_missed:Sep');
    const { result } = renderHook(() => useCoachDot([makeLogMissedMove('Sep', 2), makeCallAprMove('c1', 300)], false));
    expect(result.current).toBe(true);
  });

  it('still clears for the session when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const moves = [makeLogMissedMove('Sep', 2)];
    const { result, rerender } = renderHook(({ moves: m, open }: Props) => useCoachDot(m, open), {
      initialProps: { moves, open: false },
    });
    expect(result.current).toBe(true);
    rerender({ moves, open: true });
    rerender({ moves, open: false });
    expect(result.current).toBe(false);
  });
});
