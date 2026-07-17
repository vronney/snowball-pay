import { describe, expect, it } from 'vitest';
import {
  WIN_BACK_CHECK_KEY,
  getInactiveDays,
  getLatestPlanActivityAt,
  hasReceivedWinBack,
  isInactiveForWinBack,
} from '@/lib/lifecycleWinBack';

describe('lifecycle win-back targeting', () => {
  const now = new Date('2026-07-16T12:00:00.000Z');

  it('uses the latest durable plan change or payment as activity', () => {
    const latest = getLatestPlanActivityAt({
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      debts: [
        { updatedAt: new Date('2026-04-01T00:00:00.000Z') },
        { updatedAt: new Date('2026-05-01T00:00:00.000Z') },
      ],
      income: { updatedAt: new Date('2026-05-15T00:00:00.000Z') },
      paymentRecords: [{ paidAt: new Date('2026-06-20T00:00:00.000Z') }],
    });

    expect(latest.toISOString()).toBe('2026-06-20T00:00:00.000Z');
  });

  it('becomes eligible at 30 complete inactive days', () => {
    const twentyNineDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    expect(getInactiveDays(twentyNineDaysAgo, now)).toBe(29);
    expect(isInactiveForWinBack(twentyNineDaysAgo, now)).toBe(false);
    expect(isInactiveForWinBack(thirtyDaysAgo, now)).toBe(true);
  });

  it('recognizes only the versioned one-time delivery flag', () => {
    expect(hasReceivedWinBack({ [WIN_BACK_CHECK_KEY]: true })).toBe(true);
    expect(hasReceivedWinBack({ winback_sent_at: '2026-07-01' })).toBe(false);
    expect(hasReceivedWinBack(null)).toBe(false);
  });
});
