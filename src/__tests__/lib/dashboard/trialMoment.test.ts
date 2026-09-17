import { describe, expect, it } from 'vitest';
import { baselineDay, trialBaselineFields } from '@/lib/dashboard/trialMoment';

describe('the trial baseline (spec §6.4; plan decision 4)', () => {
  it("stores the client's calendar day as that day's UTC midnight, whatever the hour", () => {
    expect(baselineDay(new Date(2026, 8, 17, 23, 30))).toEqual(new Date(Date.UTC(2026, 8, 17)));
    expect(baselineDay(new Date(2026, 8, 17, 0, 5))).toEqual(new Date(Date.UTC(2026, 8, 17)));
  });

  it('writes nothing without a plan that pays off', () => {
    expect(trialBaselineFields(null, new Date(2026, 8, 17))).toEqual({});
  });

  it("records the plan's months and total interest on that day", () => {
    expect(trialBaselineFields({ months: 31, totalInterest: 5_012.34 }, new Date(2026, 8, 17, 9))).toEqual({
      trialBaselineAt: new Date(Date.UTC(2026, 8, 17)),
      trialBaselineMonths: 31,
      trialBaselineInterest: 5_012.34,
    });
  });
});
