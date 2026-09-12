import type { PayoffMethod } from '@/lib/snowball';

export type ReadinessStepId = 'debts' | 'income' | 'expenses' | 'dueDates' | 'firstPayment';
export interface ReadinessStep {
  id: ReadinessStepId;
  complete: boolean;
  /** Items still to do (e.g. debts missing a due day). 0 when complete; 1 for non-countable steps. */
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
export interface RateWatch { cards: number; annualEstimate: number; top: RateOpportunity }

export interface StrategyComparison {
  current: 'snowball' | 'avalanche';
  currentInterest: number;
  alternative: 'snowball' | 'avalanche';
  alternativeInterest: number;
  /** max(0, currentInterest − alternativeInterest) */
  alternativeSaves: number;
}

/** amount > 0 = ahead of plan, < 0 = behind (usePlannerComputed semantics). */
export interface PlanGap { amount: number; asOfMonth: string }

export type StreakCellState = 'inactive' | 'logged' | 'missed' | 'current' | 'currentComplete' | 'future';
export interface StreakCell { month: string; state: StreakCellState }
export interface ProgressSummary { paidToDate: number; startingTotal: number; streak: number; grid: StreakCell[] }

export interface PlanSummary { method: PayoffMethod; months: number; debtFreeDate: string; totalInterest: number }

export interface TierInfo { proEligible: boolean; paidPro: boolean; trial: { active: boolean; endsAt: string | null } }

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

/** PR 4 adds `uncounted`; PR 6 adds `trialMoment` and trial eligibility on `tier`. */
export interface DashboardInsights {
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
}
