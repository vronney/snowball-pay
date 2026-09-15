import { describe, expect, it } from 'vitest';
import { floorDollars, floorWhole, longMonthLabel, monthYearLabel, shortMonthLabel } from '@/lib/dashboard/format';

describe('floorWhole', () => {
  it('floors to whole dollars and never rounds up', () => {
    expect(floorWhole(840.99)).toBe('$840');
    expect(floorWhole(1656.9)).toBe('$1,656');
  });

  it('absorbs float error just under a whole number', () => {
    expect(floorWhole(74.99999999999)).toBe('$75');
    expect(floorDollars(0.99)).toBe(0);
  });
});

describe('month labels', () => {
  it('names months from a 0-11 index', () => {
    expect(shortMonthLabel(8)).toBe('Sep');
    expect(longMonthLabel(0)).toBe('January');
  });

  it('reads "Month YYYY" from a YYYY-MM-DD date without a time zone', () => {
    expect(monthYearLabel('2029-04-14')).toBe('April 2029');
    expect(monthYearLabel('2029-12-31')).toBe('December 2029');
  });

  it('returns null for anything that is not a calendar month', () => {
    expect(monthYearLabel('2029-13-01')).toBeNull();
    expect(monthYearLabel('2029-00-10')).toBeNull();
    expect(monthYearLabel('April 2029')).toBeNull();
  });
});
