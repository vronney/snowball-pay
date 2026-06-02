import { type Income } from '@/types';
import { type PlanMetrics } from '@/lib/payoffPlan';
import { formatCurrency } from '@/lib/utils';

export type { PlanMetrics } from '@/lib/payoffPlan';

export interface CashFlowStage {
  label: string;
  amount: number;
  range: [number, number];
  fill: string;
  helper: string;
}

export type CoachTone = 'neutral' | 'good' | 'warn' | 'danger';

export interface CoachTakeawayData {
  tone: CoachTone;
  title: string;
  evidence: string;
  action: string;
}

export function buildCashFlowStages(
  income: Income,
  metrics: PlanMetrics,
): CashFlowStage[] {
  const stages: CashFlowStage[] = [];
  let remaining = income.monthlyTakeHome;

  stages.push({
    label: 'Take-home',
    amount: income.monthlyTakeHome,
    range: [0, income.monthlyTakeHome],
    fill: '#2563eb',
    helper: 'Monthly income',
  });

  const deductions: Omit<CashFlowStage, 'range'>[] = [
    {
      label: 'Essentials',
      amount: -income.essentialExpenses,
      fill: '#64748b',
      helper: 'Rent, food, utilities, insurance',
    },
    {
      label: 'Recurring',
      amount: -metrics.recurringTotal,
      fill: '#94a3b8',
      helper: 'Monthly recurring costs',
    },
    {
      label: 'Minimums',
      amount: -metrics.totalMinPayments,
      fill: '#d97706',
      helper: 'Required debt payments',
    },
    {
      label: 'Acceleration',
      amount: -metrics.effectiveAcceleration,
      fill: '#059669',
      helper: 'Extra payment planned',
    },
  ];

  for (const deduction of deductions) {
    if (deduction.amount === 0) continue;
    const next = remaining + deduction.amount;
    stages.push({
      ...deduction,
      range: [Math.min(next, remaining), Math.max(next, remaining)],
    });
    remaining = next;
  }

  stages.push({
    label: remaining >= 0 ? 'Buffer' : 'Shortfall',
    amount: remaining,
    range: remaining >= 0 ? [0, remaining] : [remaining, 0],
    fill: remaining >= 0 ? '#0f9f6e' : '#dc2626',
    helper: remaining >= 0 ? 'Left after planned payments' : 'Monthly gap',
  });

  return stages;
}

export function buildCashFlowCoach(
  income: Income | null | undefined,
  metrics: PlanMetrics | null,
  stages: CashFlowStage[],
): CoachTakeawayData {
  if (!income || !metrics) {
    return {
      tone: 'neutral',
      title: 'Add income to unlock the cash-flow read',
      evidence: 'This chart needs take-home pay, essentials, minimums, and planned acceleration.',
      action: 'Enter the monthly budget before changing payoff speed.',
    };
  }

  const endingStage = stages.at(-1);
  const buffer = endingStage?.amount ?? 0;
  const bufferPct = income.monthlyTakeHome > 0 ? (buffer / income.monthlyTakeHome) * 100 : 0;

  if (buffer < 0) {
    return {
      tone: 'danger',
      title: 'The plan is short before speed matters',
      evidence: `${formatCurrency(Math.abs(buffer))} more is needed after essentials, minimums, and planned acceleration.`,
      action: 'Lower acceleration, cut a recurring cost, or add income before increasing payoff pressure.',
    };
  }

  if (bufferPct < 5) {
    return {
      tone: 'warn',
      title: 'The payoff pace leaves a thin buffer',
      evidence: `${formatCurrency(buffer)} remains after planned debt payments, about ${bufferPct.toFixed(1)}% of take-home pay.`,
      action: 'Hold extra payments at this level until the monthly buffer is less fragile.',
    };
  }

  return {
    tone: 'good',
    title: 'The current pace fits the month',
    evidence: `${formatCurrency(buffer)} remains after minimums and acceleration.`,
    action: 'Keep the extra payment pointed at the current focus debt.',
  };
}
