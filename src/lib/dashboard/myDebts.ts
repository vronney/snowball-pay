import type { Debt } from '@/types';
import type { DebtPayoffSchedule } from '@/lib/snowball';
import { isActiveDebt, isInPlan } from '@/lib/monthlyFocusDebt';
import { formatCurrency, formatCurrencyWhole, formatMonths } from '@/lib/utils';
import { monthYearLabel } from './format';
import type { PlanSummary, TierInfo, Uncounted } from './types';

type MemberDebt = Pick<Debt, 'id' | 'balance' | 'inPlan'>;

export interface PlanMembership<T extends MemberDebt> {
  /** In-plan debts, paid-off ones included: what the Free cap counts (spec §6.3). */
  counted: T[];
  /** Saved outside the plan, paid-off ones included. */
  outside: T[];
  total: number;
  /** Σ balance of the active counted debts. */
  countedBalance: number;
  /** Σ balance of the active outside debts. */
  outsideBalance: number;
}

export function planMembership<T extends MemberDebt>(debts: ReadonlyArray<T>): PlanMembership<T> {
  const counted = debts.filter(isInPlan);
  const outside = debts.filter((d) => !isInPlan(d));
  const activeBalance = (list: T[]) => list.filter(isActiveDebt).reduce((sum, d) => sum + d.balance, 0);
  return {
    counted,
    outside,
    total: debts.length,
    countedBalance: activeBalance(counted),
    outsideBalance: activeBalance(outside),
  };
}

// ── The two-up totals and the pill (spec §8.5 My Debts) ────────────────────

export interface DebtsSummaryView { pill: string; counted: string; notCounted: string }

/** Null unless some debt is saved outside the plan. */
export function debtsSummaryView(m: PlanMembership<MemberDebt>): DebtsSummaryView | null {
  if (m.outside.length === 0) return null;
  return {
    pill: `${m.counted.length} of ${m.total} counted`,
    counted: formatCurrency(m.countedBalance),
    notCounted: formatCurrency(m.outsideBalance),
  };
}

// ── The closing card and upgrade moment E ─────────────────────────────────

const monthsPhrase = (n: number) => `${n} ${n === 1 ? 'month' : 'months'}`;

/** "Count all {n} — $X/mo" (spec §7 E). PR 6 adds the trial variant. */
export function countAllLabel(total: number, price: number): string {
  return `Count all ${total} — ${formatCurrencyWhole(price)}/mo`;
}

export interface DebtsClosingView { date: string; text: string; cta: string }

/**
 * The My Debts closing card (spec §8.4 "Debts closing"): for Free accounts
 * with debts outside the plan and a dated plan. Pro and trial never see it.
 */
export function debtsClosingView(args: {
  uncounted: Uncounted | null;
  plan: PlanSummary | null;
  tier: TierInfo;
  total: number;
  price: number;
}): DebtsClosingView | null {
  const { uncounted, plan, tier, total, price } = args;
  if (!uncounted || tier.proEligible || !plan || plan.months <= 0) return null;
  const date = monthYearLabel(plan.debtFreeDate);
  if (!date) return null;
  const months = uncounted.monthsImpact;
  const tail = months != null && months >= 1 ? ` — about ${monthsPhrase(months)} it doesn't include` : '';
  return {
    date,
    text: `${date} ignores ${formatCurrency(uncounted.balance)}${tail}.`,
    cta: countAllLabel(total, price),
  };
}

export interface UpgradeSheetEView { eyebrow: string; title: string; body: string; cta: string }

/** Moment E's copy (spec §7 E; the title is the README's). */
export function upgradeSheetEView(args: {
  countedCount: number;
  total: number;
  uncounted: Uncounted;
  date: string;
  price: number;
}): UpgradeSheetEView {
  const { countedCount, total, uncounted, date, price } = args;
  const balance = formatCurrency(uncounted.balance);
  const lead = uncounted.count === 1
    ? `The uncounted balance adds ${balance}`
    : `The ${uncounted.count} uncounted balances add ${balance}`;
  const months = uncounted.monthsImpact;
  const middle = months != null && months >= 1 ? ` and roughly ${monthsPhrase(months)}` : '';
  return {
    eyebrow: `Debt ${countedCount + 1} of ${total} · saved, not counted`,
    title: `Your date is built from ${countedCount} of your ${total} debts.`,
    body: `${lead}${middle} that ${date} doesn't include.`,
    cta: countAllLabel(total, price),
  };
}

// ── The focus card (D12) ──────────────────────────────────────────────────

export interface FocusCardView {
  debtId: string;
  name: string;
  balance: string;
  apr: string | null;
  /** The planned payment "Log payment" writes. */
  amount: number;
  amountLabel: string;
  goneIn: string | null;
}

/**
 * v1 This Month's focus-card figures, verbatim (ThisMonthTab.tsx:122-127,
 * 357): the planned payment is the minimum plus this month's effective
 * acceleration; "gone in" is the schedule's payoff month.
 */
export function focusCardView(
  debt: Pick<Debt, 'id' | 'name' | 'balance' | 'interestRate' | 'minimumPayment'>,
  schedule: Pick<DebtPayoffSchedule, 'monthPaidOff'> | null,
  effectiveAcceleration: number,
): FocusCardView {
  const amount = debt.minimumPayment + Math.max(0, effectiveAcceleration);
  return {
    debtId: debt.id,
    name: debt.name,
    balance: formatCurrency(debt.balance),
    apr: debt.interestRate > 0 ? `${debt.interestRate}% APR` : null,
    amount,
    amountLabel: formatCurrency(amount),
    goneIn: schedule && schedule.monthPaidOff > 0 ? formatMonths(schedule.monthPaidOff) : null,
  };
}

// ── The add-debt sheet and the row order ──────────────────────────────────

/** Shown before a Free account at the cap saves: this debt lands outside the plan. */
export function outsidePlanNotice(countedCount: number, limit: number, proEligible: boolean): string | null {
  if (proEligible || countedCount < limit) return null;
  return `On Free, your plan counts ${limit} debts. This one will be saved outside it.`;
}

/** Payoff order (the plan's rank), unranked after ranked, paid-off last; ties keep the given order. */
export function orderByPlan<T extends Pick<Debt, 'id' | 'balance'>>(
  debts: ReadonlyArray<T>,
  rankById: ReadonlyMap<string, number>,
): T[] {
  const rank = (d: T) => rankById.get(d.id) ?? Number.MAX_SAFE_INTEGER;
  return [...debts].sort((a, b) => {
    const aActive = isActiveDebt(a);
    const bActive = isActiveDebt(b);
    if (aActive !== bActive) return aActive ? -1 : 1;
    return rank(a) - rank(b);
  });
}
