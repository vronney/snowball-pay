/**
 * fallback.ts
 * -------------------------------------------------------------------------
 * Deterministic recommendation set served when the AI provider errors, times
 * out, or returns an unparsable/degraded response. Kept as a pure, framework-
 * free function so it can be unit-tested in isolation (the API route imports
 * it). No React, no data fetching, no Prisma.
 * -------------------------------------------------------------------------
 */

import { formatMonths } from '@/lib/utils';

export type RecommendationType =
  | 'payoff_advice'
  | 'spending_insight'
  | 'month_change'
  | 'behavior_nudge'
  | 'debt_risk_alert'
  | 'negotiation_suggestion';

export interface FallbackDebt {
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  category: string;
  creditLimit?: number | null;
}

export interface FallbackExpense {
  name: string;
  amount: number;
  category: string;
}

/**
 * The subset of the recommendation request payload the fallback builder reads.
 * The route's full `RecommendationPayload` is structurally assignable to this.
 */
export interface FallbackInput {
  debts: FallbackDebt[];
  expenseItems: FallbackExpense[];
  monthlyTakeHome: number;
  extraPayment: number;
  planMonths: number;
  availableCashFlow: number;
}

export interface FallbackRecommendation {
  type: RecommendationType;
  impact: 'high' | 'medium' | 'low';
  title: string;
  body: string;
  action: string;
  why?: string;
  action_payload?: { action_type: 'reallocate_funds'; source_amount: number };
}

function dollars(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

const monthsLabel = formatMonths;

export function buildFallbackRecommendations(
  body: FallbackInput,
  totalDebt: number,
  totalMin: number,
  monthChangeContext: string,
): FallbackRecommendation[] {
  const activeDebts = body.debts.filter((debt) => debt.balance > 0.01);
  const highestAprDebt = [...activeDebts].sort(
    (a, b) => b.interestRate - a.interestRate || b.balance - a.balance,
  )[0];
  // The negotiation panel only covers credit cards (isNegotiableCard), so the
  // negotiation tip must not point at a loan it can't build scripts for.
  const highestAprCard = [...activeDebts]
    .filter((debt) => debt.category === 'Credit Card')
    .sort((a, b) => b.interestRate - a.interestRate || b.balance - a.balance)[0];
  const topExpense = [...body.expenseItems]
    .filter((expense) => expense.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0];
  const availableAcceleration = Math.max(0, body.availableCashFlow);
  const debtLoadPct = body.monthlyTakeHome > 0
    ? ((totalMin + body.extraPayment) / body.monthlyTakeHome) * 100
    : 0;
  const highUtilDebt = activeDebts.find(
    (debt) =>
      debt.category === 'Credit Card' &&
      (debt.creditLimit ?? 0) > 0 &&
      debt.balance / (debt.creditLimit ?? 1) >= 0.8,
  );

  return [
    {
      type: 'payoff_advice',
      impact: highestAprDebt?.interestRate >= 15 ? 'high' : 'medium',
      title: highestAprDebt ? `Prioritize ${highestAprDebt.name}` : 'Pick one focus debt',
      body: highestAprDebt
        ? `${highestAprDebt.name} carries ${highestAprDebt.interestRate}% APR on ${dollars(highestAprDebt.balance)}. That is the strongest interest drag in the current list.`
        : `Your combined debt is ${dollars(totalDebt)}. Choose one focus balance for all extra payments this month.`,
      action: highestAprDebt ? `Focus extra cash there` : 'Choose a focus debt',
      why: highestAprDebt
        ? `It is the most expensive debt in the current list.`
        : `Focused payments reduce decision fatigue.`,
    },
    {
      type: 'spending_insight',
      impact: topExpense && topExpense.amount >= 100 ? 'medium' : 'low',
      title: topExpense ? `Review ${topExpense.name}` : 'Find one small cut',
      body: topExpense
        ? `${topExpense.name} is your largest listed recurring expense at ${dollars(topExpense.amount)}/mo. A 10% trim would free about ${dollars(Math.max(1, Math.round(topExpense.amount * 0.1)))}/mo.`
        : `No recurring expense detail was supplied. Look for one repeat expense to redirect toward debt this month.`,
      action: topExpense ? 'Test a one-month reduction' : 'Review recurring expenses',
      why: topExpense
        ? `It is the largest expense item included in the request.`
        : `More acceleration shortens the payoff timeline.`,
      ...(topExpense
        ? {
            action_payload: {
              action_type: 'reallocate_funds' as const,
              source_amount: Math.max(1, Math.round(topExpense.amount * 0.1)),
            },
          }
        : {}),
    },
    {
      type: 'month_change',
      impact: 'medium',
      title: 'Update this month',
      body: monthChangeContext.includes('No monthly snapshot')
        ? `No snapshot history exists yet. Add this month’s balances so future recommendations can track movement over time.`
        : monthChangeContext.replace(/^- /gm, '').replace(/\n/g, ' '),
      action: 'Record current balances',
      why: `Month-over-month balance history improves plan accuracy.`,
    },
    {
      type: 'behavior_nudge',
      impact: availableAcceleration > 0 ? 'medium' : 'high',
      title: 'Schedule payment review',
      body: availableAcceleration > 0
        ? `You show ${dollars(availableAcceleration)} available for acceleration. Decide where it goes before payday spending absorbs it.`
        : `Available acceleration is tight at ${dollars(availableAcceleration)}. The useful habit is protecting minimums, not forcing an extra payment.`,
      action: 'Set a payday reminder',
      why: `A recurring review makes the payoff plan easier to maintain.`,
    },
    {
      type: 'debt_risk_alert',
      impact: debtLoadPct >= 35 || highUtilDebt ? 'high' : 'medium',
      title: highUtilDebt ? 'High utilization risk' : 'Watch debt load',
      body: highUtilDebt
        ? `${highUtilDebt.name} appears above 80% utilization. Avoid adding new charges while paying it down.`
        : `Debt payments are ${debtLoadPct.toFixed(1)}% of take-home pay with a ${monthsLabel(body.planMonths)} timeline. That is the buffer signal to watch before increasing acceleration.`,
      action: highUtilDebt ? 'Pause new card charges' : 'Protect cash buffer',
      why: highUtilDebt
        ? `High utilization can increase financial pressure.`
        : `Debt payment load affects plan sustainability.`,
    },
    {
      type: 'negotiation_suggestion',
      impact: highestAprCard?.interestRate >= 20 ? 'high' : 'medium',
      title: 'Ask for APR relief',
      body: highestAprCard
        ? `${highestAprCard.name} charges ${highestAprCard.interestRate}% APR on ${dollars(highestAprCard.balance)} — roughly ${dollars((highestAprCard.balance * highestAprCard.interestRate) / 100)}/yr in interest at that rate. Most cardholders who ask get a reduction. The negotiation panel has the full call script, rebuttals, and letter templates prefilled for this card.`
        : `APR negotiation works best on credit cards. Add a credit card to your tracked debts and the negotiation panel will build prefilled call scripts and letter templates for it.`,
      action: highestAprCard
        ? 'Open the full scripts panel'
        : 'Track a credit card to unlock scripts',
      why: highestAprCard
        ? `${highestAprCard.interestRate}% APR makes this a strong negotiation target.`
        : `Lower rates can reduce total interest paid.`,
    },
  ];
}
