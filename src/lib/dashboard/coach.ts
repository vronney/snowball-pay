import { formatCurrencyWhole } from '@/lib/utils';
import { coachMoveCopy, type CoachMoveCopy } from './coachMoveCopy';
import { summarizeMoveValues } from './coachMoves';
import { floorDollars, floorWhole } from './format';
import { METHOD_LABEL } from './methodLabel';
import { freeMoveView, type FreeMoveView } from './thisMonth';
import type { CoachMove, CoachMoveId, DashboardInsights } from './types';

/** A unit, not a price: the price itself is always PLANS.pro.price. */
const MONTHS_PER_YEAR = 12;

type MovesInput = Pick<DashboardInsights, 'tier' | 'coachMoves'>;

const gatedMoves = (insights: MovesInput): CoachMove[] =>
  insights.tier.proEligible ? [] : insights.coachMoves.filter((m) => !m.isFree);

// ── The free move on Coach (README §5b) ───────────────────────────────────

/**
 * This Month's free-move view with two Coach differences: unused cash gets
 * the one-tap apply (on This Month the slider is a tab away; here it isn't),
 * and the in-card "more moves" row is dropped because the priced list follows.
 */
export function coachFreeMoveView(
  insights: Pick<DashboardInsights, 'tier' | 'coachMoves' | 'asOf'>,
): FreeMoveView | null {
  const view = freeMoveView(insights);
  if (!view) return null;
  const cta = view.move.id === 'use_unallocated'
    ? { action: 'apply_unallocated' as const, label: `Apply ${floorWhole(view.move.facts.unusedMonthly)}/mo` }
    : view.cta;
  return { ...view, cta, moreCount: 0 };
}

// ── The priced list (README §5c) ──────────────────────────────────────────

export interface GatedMoveRow { id: CoachMoveId; title: string; value: string }
export interface MoreMovesView { heading: string; rows: GatedMoveRow[] }

function moveValue(move: CoachMove, copy: CoachMoveCopy): string {
  if (copy.valueLabel) return copy.valueLabel;
  // log_missed carries no value label. It is always the first (free) move,
  // so this is a safety net rather than a path the rules reach.
  return `${move.value.amount} ${move.value.amount === 1 ? 'payment' : 'payments'}`;
}

/**
 * Every gated move's title and value, fully readable: the gate is volume,
 * never blur (README "The System", rule 1). Null for Pro or with nothing gated.
 */
export function moreMovesView(insights: MovesInput): MoreMovesView | null {
  const gated = gatedMoves(insights);
  if (gated.length === 0) return null;
  return {
    heading: `${gated.length} more ${gated.length === 1 ? 'move' : 'moves'} found`,
    rows: gated.map((move) => {
      const copy = coachMoveCopy(move);
      return { id: move.id, title: copy.title, value: moveValue(move, copy) };
    }),
  };
}

// ── The ink closing card (spec §8.4 "Coach closing"; X7) ──────────────────

export interface CoachClosingView { text: string; cta: string }

/**
 * "Those {n} are worth ${perYear}/yr{, plus ${oneTime} over the plan}{ and
 * {m} months sooner}. Pro is ${price×12}/yr." Each clause appears only when
 * its value floors to at least $1 or 1 month, the units are never added
 * together, and with no clause at all the card hides.
 */
export function coachClosingView(insights: MovesInput, price: number): CoachClosingView | null {
  const gated = gatedMoves(insights);
  if (gated.length === 0) return null;
  const summary = summarizeMoveValues(gated);
  const perYear = floorDollars(summary.perYear);
  const oneTime = floorDollars(summary.oneTime);
  const months = Math.floor(summary.monthsSooner);
  const money: string[] = [];
  if (perYear >= 1) money.push(`${formatCurrencyWhole(perYear)}/yr`);
  if (oneTime >= 1) money.push(`${formatCurrencyWhole(oneTime)} over the plan`);
  const monthsClause = months >= 1 ? `${months} ${months === 1 ? 'month' : 'months'} sooner` : null;
  const n = gated.length;
  let lead: string;
  if (money.length > 0) {
    lead = `${n === 1 ? 'That move is' : `Those ${n} are`} worth ${money.join(', plus ')}${monthsClause ? ` and ${monthsClause}` : ''}`;
  } else if (monthsClause) {
    lead = `${n === 1 ? 'That move finishes' : `Those ${n} finish`} your plan ${monthsClause}`;
  } else {
    return null;
  }
  return {
    text: `${lead}. Pro is ${formatCurrencyWhole(price * MONTHS_PER_YEAR)}/yr.`,
    cta: n === 1 ? 'Unlock the move' : `Unlock all ${n}`,
  };
}

// ── Pro: every move open (spec §8.5 Coach) ────────────────────────────────

export type OpenMoveAction = 'bulk_log' | 'apply_unallocated' | 'switch_strategy' | 'apr_script';
export interface OpenMoveRow {
  move: CoachMove;
  copy: CoachMoveCopy;
  priority: 'High' | 'Medium';
  cta: { action: OpenMoveAction; label: string };
}

function openMoveCta(move: CoachMove): OpenMoveRow['cta'] {
  switch (move.id) {
    case 'log_missed':
      return { action: 'bulk_log', label: move.facts.missedCount === 1 ? 'Log it now' : 'Log them now' };
    case 'use_unallocated':
      return { action: 'apply_unallocated', label: `Apply ${floorWhole(move.facts.unusedMonthly)}/mo` };
    case 'switch_strategy':
      return { action: 'switch_strategy', label: `Switch to ${METHOD_LABEL[move.facts.alternative]}` };
    case 'call_apr':
      return { action: 'apr_script', label: 'Open the call script' };
  }
}

/** Pro and trial: the same moves, every one open with its action. Empty for Free. */
export function openMoveRows(insights: MovesInput): OpenMoveRow[] {
  if (!insights.tier.proEligible) return [];
  return insights.coachMoves.map((move) => ({
    move,
    copy: coachMoveCopy(move),
    priority: move.priority === 'high' ? 'High' : 'Medium',
    cta: openMoveCta(move),
  }));
}
