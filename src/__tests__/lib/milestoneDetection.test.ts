import { describe, expect, it } from 'vitest';
import { detectMilestone, type MilestoneInput } from '@/lib/milestoneDetection';

function input(over: Partial<MilestoneInput> = {}): MilestoneInput {
  return {
    debtId: 'd1',
    debtName: 'Visa',
    amountPaid: 100,
    totalDebtPaid: 3000,
    totalDebtOriginal: 10000,
    isFirstPayment: false,
    debtBalance: 500,
    debtOriginalBalance: 1000,
    // Far from any anniversary.
    debtCreatedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    ...over,
  };
}

describe('detectMilestone thresholds', () => {
  it('catches a quarter crossed by a single payment', () => {
    // 24% -> 26%
    expect(detectMilestone(input({ totalDebtPaid: 2600, amountPaid: 200 }), 0)).toBe('quarter_paid');
  });

  it('does not re-award a threshold already passed', () => {
    // 26% -> 28%
    expect(detectMilestone(input({ totalDebtPaid: 2800, amountPaid: 200 }), 0)).toBeNull();
  });

  // The batch case: 20% -> 36% via a 6% and a 10% payment. Reconstructing the
  // prior total from the winning payment alone gives 26%, hiding the crossing.
  it('catches a quarter crossed by the batch rather than by its largest payment', () => {
    const batched = input({
      totalDebtPaid: 3600,
      amountPaid: 1000,
      batchAmountPaid: 1600,
    });
    expect(detectMilestone(batched, 0)).toBe('quarter_paid');

    const { batchAmountPaid: _omitted, ...unbatched } = batched;
    expect(detectMilestone(unbatched, 0)).toBeNull();
  });

  it('falls back to the single payment when no batch total is given', () => {
    expect(detectMilestone(input({ totalDebtPaid: 5100, amountPaid: 200 }), 0)).toBe('half_paid');
    expect(detectMilestone(input({ totalDebtPaid: 7600, amountPaid: 200 }), 0)).toBe('three_quarter');
  });

  it('still ranks a first payment and a payoff above any threshold', () => {
    expect(detectMilestone(input({ isFirstPayment: true, totalDebtPaid: 2600 }), 0)).toBe('first_payment');
    expect(detectMilestone(input({ debtBalance: 0, totalDebtPaid: 2600 }), 0)).toBe('debt_paid_off');
  });
});
