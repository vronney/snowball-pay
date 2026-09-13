import { describe, it, expect, vi, afterEach } from 'vitest';
import { localDateParam, resolveToday, msUntilNextLocalMidnight, onLocalDayChange } from '@/lib/dashboard/today';

const NOW = new Date(2026, 8, 12, 15, 30); // Sep 12 2026, 3:30pm local

describe('today helpers (spec §5.2)', () => {
  it('formats the local date', () => {
    expect(localDateParam(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
  it('accepts the client date within one day either side', () => {
    expect(resolveToday('2026-09-12', NOW)).toEqual(new Date(2026, 8, 12));
    expect(resolveToday('2026-09-11', NOW)).toEqual(new Date(2026, 8, 11));
    expect(resolveToday('2026-09-13', NOW)).toEqual(new Date(2026, 8, 13));
  });
  it('falls back to the server date when far off, invalid or missing', () => {
    const server = new Date(2026, 8, 12);
    expect(resolveToday('2026-09-15', NOW)).toEqual(server);
    expect(resolveToday('2026-02-30', NOW)).toEqual(server);
    expect(resolveToday('09/12/2026', NOW)).toEqual(server);
    expect(resolveToday(null, NOW)).toEqual(server);
  });
  it('round-trips', () => {
    expect(resolveToday(localDateParam(NOW), NOW)).toEqual(new Date(2026, 8, 12));
  });
});

describe('local day rollover (a tab left open overnight, CodeRabbit)', () => {
  afterEach(() => vi.useRealTimers());

  it('measures the time to the next local midnight', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 8, 13, 23, 59, 30))).toBe(30_000);
    expect(msUntilNextLocalMidnight(new Date(2026, 8, 13, 0, 0, 0))).toBe(24 * 60 * 60 * 1000);
    expect(msUntilNextLocalMidnight(new Date(2026, 11, 31, 23, 0))).toBe(60 * 60 * 1000);
  });

  it('measures real time across a 23-hour DST day (US spring forward)', () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      const beforeJump = new Date(2026, 2, 8, 1, 30); // Mar 8 2026, 1:30am EST; clocks jump 2am → 3am
      expect(beforeJump.getTimezoneOffset()).toBe(300); // the pin took effect
      expect(msUntilNextLocalMidnight(beforeJump)).toBe(21.5 * 60 * 60 * 1000);
    } finally {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    }
  });

  it('reports each new local day just after midnight until cancelled', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date(2026, 8, 13, 23, 59, 0));
    const onChange = vi.fn();
    const cancel = onLocalDayChange(onChange);

    vi.advanceTimersByTime(59_000);
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2_000); // past midnight, including the grace second
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('2026-09-14');

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith('2026-09-15');

    cancel();
    vi.advanceTimersByTime(3 * 24 * 60 * 60 * 1000);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
