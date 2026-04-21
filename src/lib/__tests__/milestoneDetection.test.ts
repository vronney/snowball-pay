import { describe, it, expect } from 'vitest';
import { detectMilestone } from '@/lib/milestoneDetection';

const base = {
  debtId: 'debt-1',
  debtName: 'Visa',
  amountPaid: 200,
  totalDebtOriginal: 10000,
  debtBalance: 4800,
  debtOriginalBalance: 5000,
  debtCreatedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
};

describe('detectMilestone', () => {
  it('returns first_payment when isFirstPayment is true', () => {
    expect(
      detectMilestone({ ...base, isFirstPayment: true, totalDebtPaid: 200 }, 0),
    ).toBe('first_payment');
  });

  it('returns debt_paid_off when debtBalance is 0', () => {
    expect(
      detectMilestone({ ...base, isFirstPayment: false, totalDebtPaid: 5000, debtBalance: 0 }, 0),
    ).toBe('debt_paid_off');
  });

  it('returns quarter_paid when crossing 25%', () => {
    // totalDebtPaid just crossed 25% (2500 of 10000), previously was below
    expect(
      detectMilestone({ ...base, isFirstPayment: false, totalDebtPaid: 2600, amountPaid: 200 }, 0),
    ).toBe('quarter_paid');
  });

  it('returns half_paid when crossing 50%', () => {
    expect(
      detectMilestone({ ...base, isFirstPayment: false, totalDebtPaid: 5100, amountPaid: 200 }, 0),
    ).toBe('half_paid');
  });

  it('returns three_quarter when crossing 75%', () => {
    expect(
      detectMilestone({ ...base, isFirstPayment: false, totalDebtPaid: 7600, amountPaid: 200 }, 0),
    ).toBe('three_quarter');
  });

  it('returns streak_six_months when streak >= 6', () => {
    expect(
      detectMilestone({ ...base, isFirstPayment: false, totalDebtPaid: 1000 }, 6),
    ).toBe('streak_six_months');
  });

  it('returns anniversary within 3 days of 1-year mark', () => {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      detectMilestone({ ...base, isFirstPayment: false, totalDebtPaid: 1000, debtCreatedAt: oneYearAgo }, 0),
    ).toBe('anniversary');
  });

  it('returns null for a regular payment with no milestone', () => {
    expect(
      detectMilestone({ ...base, isFirstPayment: false, totalDebtPaid: 1000 }, 2),
    ).toBeNull();
  });

  it('does not re-trigger quarter_paid if already past it', () => {
    // totalDebtPaid is 3000, previous was 2800 — both above 25%, no crossing
    expect(
      detectMilestone({ ...base, isFirstPayment: false, totalDebtPaid: 3000, amountPaid: 200 }, 0),
    ).toBeNull();
  });
});
