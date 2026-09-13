import type { Debt } from '@/types';
import { MAX_MONTHS } from '@/lib/snowball';
import {
  calculateResultForAcceleration,
  type PayoffIncomeInput,
  type PlanMetrics,
} from '@/lib/payoffPlan';
import type { CoachMove, PaymentGap, RateWatch, StrategyComparison } from './types';

export interface CoachMovesInput {
  paymentGap: PaymentGap | null;
  /** Short month name for copy, e.g. "Sep". */
  monthLabel: string;
  debts: Debt[];
  income: PayoffIncomeInput | null;
  metrics: PlanMetrics | null;
  strategy: StrategyComparison | null;
  rateWatch: RateWatch | null;
  proEligible: boolean;
  planStartDate?: Date;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type DraftMove = DistributiveOmit<CoachMove, 'isFree'>;

/**
 * Deterministic coach moves (D2). Each rule emits a move only when its value
 * is real and positive, so a hidden move never becomes a "$0" row. Order is
 * the ranking: the first move is the one Free users get in full (README §1d).
 */
export function computeCoachMoves(input: CoachMovesInput): CoachMove[] {
  const drafts: DraftMove[] = [];

  const gap = input.paymentGap;
  if (gap && gap.missed.length > 0) {
    drafts.push({
      id: 'log_missed',
      priority: 'high',
      value: { kind: 'count', amount: gap.missed.length },
      facts: {
        monthLabel: input.monthLabel,
        logged: gap.logged,
        expected: gap.expected,
        missedCount: gap.missed.length,
        missedMinimums: gap.missedMinimums,
      },
    });
  }

  const m = input.metrics;
  if (m && input.income && m.result.months > 0 && m.result.months < MAX_MONTHS) {
    const unusedMonthly = m.availableCashFlow - m.effectiveAcceleration;
    if (unusedMonthly >= 1) {
      const faster = calculateResultForAcceleration(
        input.debts, input.income, m, m.availableCashFlow, m.method, input.planStartDate,
      );
      const monthsSooner = m.result.months - faster.months;
      if (monthsSooner >= 1) {
        drafts.push({
          id: 'use_unallocated',
          priority: 'high',
          value: { kind: 'months', amount: monthsSooner },
          facts: { unusedMonthly, targetAcceleration: m.availableCashFlow, monthsSooner },
        });
      }
    }
  }

  const s = input.strategy;
  if (s && s.alternativeSaves >= 1) {
    drafts.push({
      id: 'switch_strategy',
      priority: 'medium',
      value: { kind: 'total', amount: s.alternativeSaves },
      facts: { alternative: s.alternative, interestDifference: s.alternativeSaves },
    });
  }

  // moveTarget already skips cards worth under $1 (rateWatch.ts).
  const target = input.rateWatch?.moveTarget;
  if (target) {
    drafts.push({
      id: 'call_apr',
      priority: 'medium',
      value: { kind: 'perYear', amount: target.annualEstimate },
      facts: target,
    });
  }

  return drafts.map((draft, index) => ({ ...draft, isFree: input.proEligible || index === 0 }) as CoachMove);
}

export interface MoveValueSummary {
  count: number;
  perYear: number;
  oneTime: number;
  monthsSooner: number;
}

/** Values for the Coach closing card. Units never mix (deviation X7). */
export function summarizeMoveValues(moves: ReadonlyArray<CoachMove>): MoveValueSummary {
  const summary: MoveValueSummary = { count: moves.length, perYear: 0, oneTime: 0, monthsSooner: 0 };
  for (const move of moves) {
    if (move.value.kind === 'perYear') summary.perYear += move.value.amount;
    else if (move.value.kind === 'total') summary.oneTime += move.value.amount;
    else if (move.value.kind === 'months') summary.monthsSooner = Math.max(summary.monthsSooner, move.value.amount);
  }
  return summary;
}
