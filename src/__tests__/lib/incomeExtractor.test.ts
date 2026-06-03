import { describe, it, expect } from 'vitest';
import { daysToFrequency, detectFrequencyFromDateRange } from '@/lib/services/documentExtraction/incomeExtractor';
import { extractIncome } from '@/lib/services/documentExtraction/incomeExtractor';

// ── daysToFrequency ───────────────────────────────────────────────────────────

describe('daysToFrequency', () => {
  it('returns weekly for 7-day periods', () => {
    expect(daysToFrequency(7)).toBe('weekly');
  });

  it('returns weekly at boundaries (6 and 8)', () => {
    expect(daysToFrequency(6)).toBe('weekly');
    expect(daysToFrequency(8)).toBe('weekly');
  });

  it('returns bi-weekly for 14-day periods', () => {
    expect(daysToFrequency(14)).toBe('bi-weekly');
  });

  it('returns bi-weekly at boundaries (13 and 14)', () => {
    expect(daysToFrequency(13)).toBe('bi-weekly');
    expect(daysToFrequency(14)).toBe('bi-weekly');
  });

  it('returns semi-monthly for 15–17 day periods', () => {
    expect(daysToFrequency(15)).toBe('semi-monthly');
    expect(daysToFrequency(16)).toBe('semi-monthly');
    expect(daysToFrequency(17)).toBe('semi-monthly');
  });

  it('returns monthly for 28–32 day periods', () => {
    expect(daysToFrequency(28)).toBe('monthly');
    expect(daysToFrequency(30)).toBe('monthly');
    expect(daysToFrequency(32)).toBe('monthly');
  });

  it('returns null for ambiguous counts (e.g. 9–12, 18–27)', () => {
    expect(daysToFrequency(9)).toBeNull();
    expect(daysToFrequency(12)).toBeNull();
    expect(daysToFrequency(18)).toBeNull();
    expect(daysToFrequency(27)).toBeNull();
  });

  it('has no overlap — 14 days is unambiguously bi-weekly, not semi-monthly', () => {
    expect(daysToFrequency(14)).toBe('bi-weekly');
    expect(daysToFrequency(14)).not.toBe('semi-monthly');
  });
});

// ── detectFrequencyFromDateRange ──────────────────────────────────────────────

describe('detectFrequencyFromDateRange', () => {
  describe('Strategy 1 — inline ranges', () => {
    it('detects weekly from slash-separated inline range', () => {
      expect(detectFrequencyFromDateRange('Pay period: 04/07/2026 - 04/13/2026')).toBe('weekly');
    });

    it('detects weekly from dash-separated inline range', () => {
      expect(detectFrequencyFromDateRange('04-07-2026 - 04-13-2026')).toBe('weekly');
    });

    it('detects bi-weekly from 14-day inline range', () => {
      expect(detectFrequencyFromDateRange('03/01/2026 - 03/14/2026')).toBe('bi-weekly');
    });

    it('detects semi-monthly from 15-day inline range', () => {
      expect(detectFrequencyFromDateRange('03/01/2026 - 03/15/2026')).toBe('semi-monthly');
    });

    it('detects monthly from 30-day inline range', () => {
      expect(detectFrequencyFromDateRange('03/01/2026 - 03/30/2026')).toBe('monthly');
    });

    it('supports "to" as separator', () => {
      expect(detectFrequencyFromDateRange('04/07/2026 to 04/13/2026')).toBe('weekly');
    });

    it('supports en-dash as separator', () => {
      expect(detectFrequencyFromDateRange('04/07/2026 – 04/13/2026')).toBe('weekly');
    });

    it('does not match "t" or "o" as separators (no character class bug)', () => {
      // "04/07/2026 t 04/13/2026" should NOT match
      expect(detectFrequencyFromDateRange('04/07/2026 t 04/13/2026')).toBeNull();
    });
  });

  describe('Strategy 2 — labeled begin/end fields (Ron pay stub format)', () => {
    it('detects weekly from Pay Begin / Pay End Date labels with dashes', () => {
      const text = 'Pay Begin Date: 05-25-2026 Advice Date: 06-04-2026 Pay End Date: 05-31-2026';
      expect(detectFrequencyFromDateRange(text)).toBe('weekly');
    });

    it('detects bi-weekly from labeled fields spanning 14 days', () => {
      const text = 'Pay Begin Date: 05-01-2026 Pay End Date: 05-14-2026';
      expect(detectFrequencyFromDateRange(text)).toBe('bi-weekly');
    });

    it('detects semi-monthly from labeled fields spanning 15 days', () => {
      const text = 'Pay Begin Date: 05-01-2026 Pay End Date: 05-15-2026';
      expect(detectFrequencyFromDateRange(text)).toBe('semi-monthly');
    });

    it('returns null when only begin label is present', () => {
      expect(detectFrequencyFromDateRange('Pay Begin Date: 05-25-2026')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('returns null when no dates are found', () => {
      expect(detectFrequencyFromDateRange('Net Pay: $1,234.56 Weekly')).toBeNull();
    });

    it('returns null for out-of-range month (13)', () => {
      expect(detectFrequencyFromDateRange('13/01/2026 - 13/07/2026')).toBeNull();
    });

    it('returns null for out-of-range day (40)', () => {
      expect(detectFrequencyFromDateRange('01/40/2026 - 01/46/2026')).toBeNull();
    });

    it('handles DST boundary correctly (uses UTC, not local time)', () => {
      // March 8, 2026 is a DST transition in the US (clocks spring forward)
      // A weekly period starting Mar 2 should still count as 7 days
      const text = '03/02/2026 - 03/08/2026';
      expect(detectFrequencyFromDateRange(text)).toBe('weekly');
    });
  });
});

// ── detectFrequency via extractIncome — precedence tests ─────────────────────

describe('extractIncome — frequency precedence', () => {
  const netPayLine = 'Net Pay: $800.00\n';

  it('date range beats incidental "weekly" keyword on a bi-weekly stub', () => {
    // Stub has "weekly pay rate" text but a 14-day date range — should be bi-weekly
    const text = `${netPayLine}Your weekly pay rate is $25/hr\nPay period: 03/01/2026 - 03/14/2026`;
    const result = extractIncome(text);
    expect(result.items[0]?.frequency).toBe('bi-weekly');
  });

  it('uses weekly keyword when no date range is present', () => {
    const text = `${netPayLine}Pay Frequency: Weekly`;
    const result = extractIncome(text);
    expect(result.items[0]?.frequency).toBe('weekly');
  });

  it('bi-weekly keyword beats date range (explicit keyword wins over inference)', () => {
    // bi-weekly keyword check happens before date-range inference
    const text = `${netPayLine}Pay Frequency: Bi-Weekly\n04/07/2026 - 04/13/2026`;
    const result = extractIncome(text);
    expect(result.items[0]?.frequency).toBe('bi-weekly');
  });

  it('normalises weekly net pay to monthly correctly (×4.33)', () => {
    const text = `Net Pay: $1,000.00\nPay Begin Date: 05-25-2026 Pay End Date: 05-31-2026`;
    const result = extractIncome(text);
    expect(result.items[0]?.monthlyTakeHome).toBeCloseTo(4330, 0);
  });
});
