import { formatCurrencyWhole } from '@/lib/utils';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Whole dollars, floored: estimates are never rounded up (spec §4). The tiny
 * epsilon guards against float error in unrounded sums landing just under a
 * whole number (75.75 - 0.00000000001 must still floor to 75, not 74).
 */
export function floorDollars(n: number): number {
  return Math.floor(n + 1e-9);
}

export function floorWhole(n: number): string {
  return formatCurrencyWhole(floorDollars(n));
}

/** month: 0-11. */
export function shortMonthLabel(month: number): string {
  return MONTH_SHORT[month] ?? '';
}

/** month: 0-11. */
export function longMonthLabel(month: number): string {
  return MONTH_LONG[month] ?? '';
}

/**
 * "2029-04-14" → "April 2029". Read from the string's own parts, so no time
 * zone can move the month (a Date built from it would read as UTC midnight).
 */
export function monthYearLabel(ymd: string): string | null {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(ymd);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${MONTH_LONG[month - 1]} ${match[1]}`;
}
