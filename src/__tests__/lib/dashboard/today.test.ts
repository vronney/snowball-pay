import { describe, it, expect } from 'vitest';
import { localDateParam, resolveToday } from '@/lib/dashboard/today';

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
