import type { BalanceSnapshot, Debt } from '@/types';
import type { DebtPayoffSchedule } from '@/lib/snowball';
import { isActiveDebt } from '@/lib/monthlyFocusDebt';
import { formatCurrency, formatMonths } from '@/lib/utils';
import { longMonthLabel, shortMonthLabel } from './format';
import { activeDebtRows, type LogRow } from './thisMonth';
import type { PaymentGap, ProgressSummary } from './types';

// ── The streak pill and the paid-off bar (README §4; spec §8.4 "Progress") ─

/** "{n}-month streak". Null under one month: there is nothing to protect yet. */
export function streakPill(streak: number): string | null {
  if (!Number.isFinite(streak) || streak < 1) return null;
  return `${streak}-month streak`;
}

export interface PaidOffView { figure: string; ofLine: string; pct: number }

/**
 * insights.progress carries ProgressTab's verbatim totals (progress.ts), so
 * the figure is the same one v1's "Total Paid" shows. Null without a starting
 * total. Concrete amounts, so cents.
 */
export function paidOffView(progress: ProgressSummary | null): PaidOffView | null {
  if (
    !progress
    || !Number.isFinite(progress.startingTotal)
    || progress.startingTotal <= 0
    || !Number.isFinite(progress.paidToDate)
  ) {
    return null;
  }
  const paid = Math.max(0, progress.paidToDate);
  return {
    figure: formatCurrency(paid),
    ofLine: `of ${formatCurrency(progress.startingTotal)}`,
    pct: Math.min(100, (paid / progress.startingTotal) * 100),
  };
}

// ── The grid caption and its CTA ──────────────────────────────────────────

export interface GridCaptionView { unlogged: number; text: string; cta: string }

/** month: 0-11. Null when nothing is unlogged (the current cell is complete). */
export function gridCaptionView(gap: PaymentGap | null, month: number): GridCaptionView | null {
  if (!gap) return null;
  const unlogged = gap.expected - gap.logged;
  if (unlogged < 1) return null;
  return {
    unlogged,
    text: `${unlogged} of ${gap.expected} ${longMonthLabel(month)} payments still unlogged.`,
    cta: `Keep the streak — log ${unlogged}`,
  };
}

/**
 * "Keep the streak": every active debt without a payment record this month,
 * at its minimum. Built from the current debts and records, like the This
 * Month sheets, so a stale insights copy can't log a paid-off debt.
 */
export function unloggedRows(
  debts: ReadonlyArray<Pick<Debt, 'id' | 'name' | 'balance' | 'minimumPayment'>>,
  paidDebtIds: ReadonlySet<string>,
): LogRow[] {
  return activeDebtRows(debts).filter((row) => !paidDebtIds.has(row.debtId));
}

/** "2026-03" → "Mar 2026", read from the key itself so no time zone can move the month. */
export function monthLabelFromKey(key: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return key;
  return `${shortMonthLabel(Number(match[2]) - 1)} ${match[1]}`;
}

// ── Milestones (README §4d) ───────────────────────────────────────────────

export interface MilestoneRowView { id: string; kind: 'paidOff' | 'next'; title: string; detail: string | null }

/**
 * "{debt} paid off · {Mon YYYY}" from the first month a debt's snapshot
 * reached $0 (no date when there is none), latest first; then "Next payoff ·
 * {debt} · in {months}" from the plan's schedule.
 */
export function milestonesView(
  debts: ReadonlyArray<Pick<Debt, 'id' | 'name' | 'balance'>>,
  snapshots: ReadonlyArray<Pick<BalanceSnapshot, 'debtId' | 'balance' | 'recordedAt'>>,
  schedule: ReadonlyArray<Pick<DebtPayoffSchedule, 'debtId' | 'monthPaidOff'>>,
): MilestoneRowView[] {
  const zeroMonthById = new Map<string, string>();
  for (const s of [...snapshots].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) {
    if (s.balance <= 0 && !zeroMonthById.has(s.debtId)) zeroMonthById.set(s.debtId, s.recordedAt.slice(0, 7));
  }
  const paidOff = debts
    .filter((d) => !isActiveDebt(d))
    .map((d) => ({ id: d.id, name: d.name, month: zeroMonthById.get(d.id) ?? null }))
    // Latest payoff first; undated last.
    .sort((a, b) => (b.month ?? '').localeCompare(a.month ?? ''))
    .map((d): MilestoneRowView => ({
      id: `paid-${d.id}`,
      kind: 'paidOff',
      title: `${d.name} paid off`,
      detail: d.month ? monthLabelFromKey(d.month) : null,
    }));

  const nameById = new Map(debts.map((d) => [d.id, d.name]));
  const activeIds = new Set(debts.filter(isActiveDebt).map((d) => d.id));
  const next = schedule
    .filter((s) => activeIds.has(s.debtId) && s.monthPaidOff > 0)
    .sort((a, b) => a.monthPaidOff - b.monthPaidOff)[0];
  const nextRow: MilestoneRowView[] = next
    ? [{ id: `next-${next.debtId}`, kind: 'next', title: `Next payoff · ${nameById.get(next.debtId) ?? ''}`, detail: `in ${formatMonths(next.monthPaidOff)}` }]
    : [];
  return [...paidOff, ...nextRow];
}
