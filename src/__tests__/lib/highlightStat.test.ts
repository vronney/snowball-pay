import { describe, it, expect } from 'vitest';
import { computeHighlightStat } from '@/lib/highlightStat';

const base = {
  pctThisDebt: 34,
  pctAllDebts: 22,
  debtName: 'Chase Sapphire',
};

describe('computeHighlightStat', () => {
  it('arm 1: monthsSaved >= 1 takes priority over tier', () => {
    expect(computeHighlightStat({ ...base, tier: 'half_paid', monthsSaved: 3 }))
      .toBe('3 months ahead of original schedule');
  });

  it('arm 1: pluralizes correctly for 1 month', () => {
    expect(computeHighlightStat({ ...base, tier: null, monthsSaved: 1 }))
      .toBe('1 month ahead of original schedule');
  });

  it('arm 1: skipped when monthsSaved is 0', () => {
    expect(computeHighlightStat({ ...base, tier: null, monthsSaved: 0 }))
      .toBe('34% of Chase Sapphire paid');
  });

  it('arm 2: debt-specific milestone — first_payment', () => {
    expect(computeHighlightStat({ ...base, tier: 'first_payment', monthsSaved: undefined }))
      .toBe('34% of Chase Sapphire paid');
  });

  it('arm 2: debt-specific milestone — debt_paid_off', () => {
    expect(computeHighlightStat({ ...base, tier: 'debt_paid_off', pctThisDebt: 100, monthsSaved: undefined }))
      .toBe('100% of Chase Sapphire paid');
  });

  it('arm 3: portfolio milestone — half_paid uses pctAllDebts', () => {
    expect(computeHighlightStat({ ...base, tier: 'half_paid', monthsSaved: undefined }))
      .toBe('22% of total debt paid');
  });

  it('arm 4: fallback for routine payment (null tier, no monthsSaved)', () => {
    expect(computeHighlightStat({ ...base, tier: null, monthsSaved: undefined }))
      .toBe('34% of Chase Sapphire paid');
  });
});
