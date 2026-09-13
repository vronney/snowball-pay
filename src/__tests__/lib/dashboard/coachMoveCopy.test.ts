import { describe, it, expect } from 'vitest';
import { coachMoveCopy } from '@/lib/dashboard/coachMoveCopy';

describe('coachMoveCopy (spec §8.4): facts only, losses and savings floored', () => {
  it('log_missed', () => {
    expect(coachMoveCopy({
      id: 'log_missed', priority: 'high', isFree: true, value: { kind: 'count', amount: 6 },
      facts: { monthLabel: 'Sep', logged: 3, expected: 9, missedCount: 6, missedMinimums: 1674 },
    })).toEqual({
      title: 'Log the 6 missing payments for Sep.',
      body: 'Sep shows 3 of 9 payments logged; 6 are past their due date — $1,674.00 in minimums.',
      valueLabel: null,
    });
  });

  it('log_missed (singular)', () => {
    expect(coachMoveCopy({
      id: 'log_missed', priority: 'high', isFree: true, value: { kind: 'count', amount: 1 },
      facts: { monthLabel: 'Oct', logged: 4, expected: 5, missedCount: 1, missedMinimums: 35 },
    }).title).toBe('Log the missing payment for Oct.');
  });

  it('use_unallocated', () => {
    expect(coachMoveCopy({
      id: 'use_unallocated', priority: 'high', isFree: false, value: { kind: 'months', amount: 14 },
      facts: { unusedMonthly: 810.9, targetAcceleration: 910, monthsSooner: 14 },
    })).toEqual({
      title: 'Put $810/mo of unused cash to work.',
      body: "It's left after essentials, minimums and your planned extra. Applying it finishes 1y 2m sooner.",
      valueLabel: '1y 2m sooner',
    });
  });

  it('switch_strategy', () => {
    expect(coachMoveCopy({
      id: 'switch_strategy', priority: 'medium', isFree: false, value: { kind: 'total', amount: 1030.99 },
      facts: { alternative: 'avalanche', interestDifference: 1030.99 },
    })).toEqual({
      title: 'Switch to Avalanche — $1,030 less interest.',
      body: 'Same payments, different order. Switching is free and recalculates the whole plan.',
      valueLabel: '$1,030',
    });
  });

  it('call_apr', () => {
    expect(coachMoveCopy({
      id: 'call_apr', priority: 'medium', isFree: false, value: { kind: 'perYear', amount: 742 },
      facts: { debtId: 'd1', debtName: 'Citi Simplicity', apr: 28.24, targetApr: 19.77, annualEstimate: 742 },
    })).toEqual({
      title: 'Call Citi Simplicity about its 28.24% APR',
      body: 'Asking for 19.77% could save about $742 a year.',
      valueLabel: '$742/yr est.',
    });
  });

  it('call_apr with an unrounded rate-watch estimate floors without float error (Codex P2)', () => {
    expect(coachMoveCopy({
      id: 'call_apr', priority: 'medium', isFree: false, value: { kind: 'perYear', amount: 75.75 },
      facts: { debtId: 'd1', debtName: 'Citi Simplicity', apr: 24.99, targetApr: 17.49, annualEstimate: 75.75 },
    })).toEqual({
      title: 'Call Citi Simplicity about its 24.99% APR',
      body: 'Asking for 17.49% could save about $75 a year.',
      valueLabel: '$75/yr est.',
    });
  });
});
