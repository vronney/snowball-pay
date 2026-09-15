import { formatCurrency, formatMonths } from '@/lib/utils';
import { formatRate } from '@/lib/apr-negotiation/apr-negotiation-adapter';
import { floorWhole } from './format';
import type { CoachMove } from './types';

export interface CoachMoveCopy {
  title: string;
  body: string;
  valueLabel: string | null;
}
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const METHOD_LABEL = { snowball: 'Snowball', avalanche: 'Avalanche' } as const;

/** One source of move copy for web and Expo. Every sentence states computed facts only. */
export function coachMoveCopy(move: CoachMove): CoachMoveCopy {
  switch (move.id) {
    case 'log_missed': {
      const f = move.facts;
      const n = f.missedCount;
      return {
        title: n === 1
          ? `Log the missing payment for ${f.monthLabel}.`
          : `Log the ${n} missing payments for ${f.monthLabel}.`,
        body: `${f.monthLabel} shows ${f.logged} of ${f.expected} payments logged; ${n} ${plural(n, 'is', 'are')} past ${plural(n, 'its', 'their')} due date — ${formatCurrency(f.missedMinimums)} in minimums.`,
        valueLabel: null,
      };
    }
    case 'use_unallocated': {
      const f = move.facts;
      return {
        title: `Put ${floorWhole(f.unusedMonthly)}/mo of unused cash to work.`,
        body: `It's left after essentials, minimums and your planned extra. Applying it finishes ${formatMonths(f.monthsSooner)} sooner.`,
        valueLabel: `${formatMonths(f.monthsSooner)} sooner`,
      };
    }
    case 'switch_strategy': {
      const f = move.facts;
      return {
        title: `Switch to ${METHOD_LABEL[f.alternative]} — ${floorWhole(f.interestDifference)} less interest.`,
        body: 'Same payments, different order. Switching is free and recalculates the whole plan.',
        valueLabel: floorWhole(f.interestDifference),
      };
    }
    case 'call_apr': {
      const f = move.facts;
      return {
        title: `Call ${f.debtName} about its ${formatRate(f.apr)}% APR`,
        body: `Asking for ${formatRate(f.targetApr)}% could save about ${floorWhole(f.annualEstimate)} a year.`,
        valueLabel: `${floorWhole(f.annualEstimate)}/yr est.`,
      };
    }
  }
}
