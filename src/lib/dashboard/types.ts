import type { PayoffMethod } from '@/lib/snowball';

export type ReadinessStepId = 'debts' | 'income' | 'expenses' | 'dueDates' | 'firstPayment';
export interface ReadinessStep {
  id: ReadinessStepId;
  complete: boolean;
  /**
   * Items still to do (e.g. debts missing a due day). 0 when complete — and
   * also for `dueDates` when there are no active debts (the CTA always
   * targets the first incomplete step, which is then `debts`). 1 for
   * non-countable steps.
   */
  pendingCount: number;
}
export interface PlanReadiness { steps: ReadinessStep[]; completeCount: number; percent: number }

export interface MonthlyInterest { monthlyEstimate: number; avgMonthlySavedByPlan: number | null }

export interface MissedPayment { debtId: string; minimumPayment: number }
export interface PaymentGap {
  expected: number;
  logged: number;
  missed: MissedPayment[];
  missedMinimums: number;
  notYetDue: number;
}

export interface RateOpportunity { debtId: string; debtName: string; apr: number; targetApr: number; annualEstimate: number }
export interface RateWatch {
  cards: number;
  annualEstimate: number;
  /** Highest-APR card: the APR-negotiation card's default. */
  top: RateOpportunity;
  /** Highest-APR card whose estimate is at least $1 — the `call_apr` move's card. */
  moveTarget: RateOpportunity | null;
}

export interface StrategyComparison {
  current: 'snowball' | 'avalanche';
  currentInterest: number;
  alternative: 'snowball' | 'avalanche';
  alternativeInterest: number;
  /** max(0, currentInterest − alternativeInterest) */
  alternativeSaves: number;
}

/**
 * amount > 0 = ahead of plan, < 0 = behind (usePlannerComputed semantics).
 * asOfMonth: engine label, e.g. "Sep 2026".
 */
export interface PlanGap { amount: number; asOfMonth: string }

export type StreakCellState = 'inactive' | 'logged' | 'missed' | 'current' | 'currentComplete' | 'future';
/** month: "YYYY-MM". */
export interface StreakCell { month: string; state: StreakCellState }
export interface ProgressSummary { paidToDate: number; startingTotal: number; streak: number; grid: StreakCell[] }

export interface PlanSummary {
  method: PayoffMethod;
  months: number;
  /**
   * Client-local calendar date YYYY-MM-DD (today + plan months). Mirrors the
   * engine's month math (`snowball.ts`), anchored on the client's day instead
   * of the server clock, so it never reads a day/month early from UTC
   * rendering. Web keeps its own client-side computation for displayed
   * dates; Expo can use this directly.
   */
  debtFreeDate: string;
  totalInterest: number;
}

/** Debts saved outside the plan on Free past the cap (spec §5.1 `uncounted.ts`). */
export interface Uncounted {
  /** Active debts saved outside the plan. */
  count: number;
  /** Their total balance. */
  balance: number;
  /**
   * Months the plan would add if they counted. Null without income, or when
   * either run can't pay off within the 360-month cap (isPayoffComplete).
   */
  monthsImpact: number | null;
}

export interface TierInfo {
  proEligible: boolean;
  paidPro: boolean;
  /** eligible: may start the self-serve trial (spec §6.4, isSelfServeTrialEligible). */
  trial: { active: boolean; endsAt: string | null; eligible: boolean };
}

/**
 * The one inline upgrade moment (spec §7): B on trial days 1–3, C in the last
 * 3 days, D for 7 days after it ends. C's rows are null when not positive.
 * interestLess is unrounded (views floor it); endedAt is ISO.
 */
export type TrialMoment =
  | { state: 'B'; day: number; daysLeft: number }
  | {
      state: 'C';
      daysLeft: number;
      elapsedDays: number;
      monthsSooner: number | null;
      interestLess: number | null;
      paymentsLogged: number | null;
    }
  | { state: 'D'; endedAt: string };

interface MoveBase { isFree: boolean }
export type CoachMove =
  | (MoveBase & { id: 'log_missed'; priority: 'high'; value: { kind: 'count'; amount: number };
      facts: { monthLabel: string; logged: number; expected: number; missedCount: number; missedMinimums: number } })
  | (MoveBase & { id: 'use_unallocated'; priority: 'high'; value: { kind: 'months'; amount: number };
      facts: { unusedMonthly: number; targetAcceleration: number; monthsSooner: number } })
  | (MoveBase & { id: 'switch_strategy'; priority: 'medium'; value: { kind: 'total'; amount: number };
      facts: { alternative: 'snowball' | 'avalanche'; interestDifference: number } })
  | (MoveBase & { id: 'call_apr'; priority: 'medium'; value: { kind: 'perYear'; amount: number }; facts: RateOpportunity });
export type CoachMoveId = CoachMove['id'];

/** PR 4 added `uncounted`; PR 6 added `trialMoment` and `tier.trial.eligible`. */
export interface DashboardInsights {
  /** month: 0-11 (JS Date semantics). */
  asOf: { year: number; month: number; day: number };
  tier: TierInfo;
  readiness: PlanReadiness;
  interest: MonthlyInterest | null;
  paymentGap: PaymentGap | null;
  coachMoves: CoachMove[];
  rateWatch: RateWatch | null;
  strategy: StrategyComparison | null;
  planGap: PlanGap | null;
  progress: ProgressSummary | null;
  plan: PlanSummary | null;
  uncounted: Uncounted | null;
  trialMoment: TrialMoment | null;
}
