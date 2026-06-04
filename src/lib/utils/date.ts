/**
 * Date Utilities
 * Shared date calculation helpers for cron jobs and other operations
 */

/**
 * Get date range for N days ago (start and end of that day)
 * Useful for daily cron jobs that target users created on specific day
 */
export function getDateRange(
  daysAgo: number,
  referenceDate = new Date(),
): { start: Date; end: Date } {
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - daysAgo);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get number of days in a month (0-indexed month)
 */
export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/**
 * Format date as "Month Day" (e.g., "June 15")
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/**
 * Format date as "Month Year" (e.g., "June 2026")
 */
export function formatDateMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Compute payment streak: consecutive months ending before targetMonth
 * where user has at least one payment record
 */
export function computeStreak(
  records: { dueYear: number; dueMonth: number }[],
  targetYear: number,
  targetMonth: number, // 0-11
  maxMonths = 24,
): number {
  let streak = 0;
  let y = targetYear;
  let m = targetMonth - 1;

  if (m < 0) {
    m = 11;
    y--;
  }

  for (let i = 0; i < maxMonths; i++) {
    if (!records.some((r) => r.dueYear === y && r.dueMonth === m)) break;
    streak++;
    m--;
    if (m < 0) {
      m = 11;
      y--;
    }
  }

  return streak;
}
