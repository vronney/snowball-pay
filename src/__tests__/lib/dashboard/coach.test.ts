import { describe, expect, it } from 'vitest';
import { coachClosingView, coachFreeMoveView, moreMovesView, openMoveRows } from '@/lib/dashboard/coach';
import { makeCallAprMove, makeLogMissedMove, makeSwitchMove, makeUnallocatedMove } from './fixtures';

const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
const PRO = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null } };
const asOf = { year: 2026, month: 8, day: 15 };
// A stand-in price so the ×12 is visible in the expectation; product code reads PLANS.pro.price.
const PRICE = 10;

describe('coachFreeMoveView (Coach; decision 2)', () => {
  it('turns unused cash into a one-tap apply and drops the in-card more-moves row', () => {
    const view = coachFreeMoveView({ tier: FREE, asOf, coachMoves: [makeUnallocatedMove(3, true), makeCallAprMove('citi', 742)] });
    expect(view?.cta).toEqual({ action: 'apply_unallocated', label: 'Apply $200/mo' });
    expect(view?.moreCount).toBe(0);
    expect(view?.eyebrow).toBe('Your free move · Sep');
  });

  it('keeps the other free moves as This Month has them', () => {
    expect(coachFreeMoveView({ tier: FREE, asOf, coachMoves: [makeLogMissedMove('Sep', 2)] })?.cta).toEqual({ action: 'bulk_log', label: 'Log them now' });
    expect(coachFreeMoveView({ tier: FREE, asOf, coachMoves: [makeSwitchMove('avalanche', 90, true)] })?.cta).toEqual({ action: 'switch_strategy', label: 'Switch to Avalanche' });
    // Decision 1: the call script stays Pro, so the free call_apr move has no button.
    expect(coachFreeMoveView({ tier: FREE, asOf, coachMoves: [makeCallAprMove('citi', 742, true)] })?.cta).toBeNull();
  });

  it('is null for Pro', () => {
    expect(coachFreeMoveView({ tier: PRO, asOf, coachMoves: [makeLogMissedMove('Sep', 1)] })).toBeNull();
  });
});

describe('moreMovesView (README §5c: every title and value visible)', () => {
  it('lists every gated move with its title and value', () => {
    const view = moreMovesView({
      tier: FREE,
      coachMoves: [makeLogMissedMove('Sep', 2), makeCallAprMove('Citi', 742.9), makeUnallocatedMove(1), makeSwitchMove('avalanche', 1030.4)],
    });
    expect(view?.heading).toBe('3 more moves found');
    expect(view?.rows).toEqual([
      { id: 'call_apr', title: expect.stringMatching(/^Call Citi about its 28(\.\d+)?% APR$/), value: '$742/yr est.' },
      { id: 'use_unallocated', title: 'Put $200/mo of unused cash to work.', value: '1m sooner' },
      { id: 'switch_strategy', title: 'Switch to Avalanche — $1,030 less interest.', value: '$1,030' },
    ]);
  });

  it('uses the singular, and hides for Pro or with nothing gated', () => {
    expect(moreMovesView({ tier: FREE, coachMoves: [makeLogMissedMove('Sep', 2), makeCallAprMove('Citi', 742)] })?.heading).toBe('1 more move found');
    expect(moreMovesView({ tier: PRO, coachMoves: [makeCallAprMove('Citi', 742)] })).toBeNull();
    expect(moreMovesView({ tier: FREE, coachMoves: [makeLogMissedMove('Sep', 2)] })).toBeNull();
  });
});

describe('coachClosingView (spec §8.4 "Coach closing"; X7: units never mixed)', () => {
  it('states per-year, one-time and months clauses separately and prices Pro per year', () => {
    const view = coachClosingView({
      tier: FREE,
      coachMoves: [makeLogMissedMove('Sep', 1), makeCallAprMove('Citi', 742.9), makeSwitchMove('avalanche', 1030.4), makeUnallocatedMove(1)],
    }, PRICE);
    expect(view).toEqual({
      text: 'Those 3 are worth $742/yr, plus $1,030 over the plan and 1 month sooner. Pro is $120/yr.',
      cta: 'Unlock all 3',
    });
  });

  it('leads with the one-time clause when there is no per-year value, and uses the singular', () => {
    expect(coachClosingView({ tier: FREE, coachMoves: [makeLogMissedMove('Sep', 1), makeSwitchMove('avalanche', 300)] }, PRICE)).toEqual({
      text: 'That move is worth $300 over the plan. Pro is $120/yr.',
      cta: 'Unlock the move',
    });
  });

  it('words a months-only value as finishing sooner', () => {
    const view = coachClosingView({
      tier: FREE,
      coachMoves: [makeLogMissedMove('Sep', 1), makeUnallocatedMove(2), makeCallAprMove('Citi', 0.4)],
    }, PRICE);
    expect(view?.text).toBe('Those 2 finish your plan 2 months sooner. Pro is $120/yr.');
  });

  it('hides for Pro, with nothing gated, or when the gated moves carry no value', () => {
    expect(coachClosingView({ tier: PRO, coachMoves: [makeCallAprMove('Citi', 742)] }, PRICE)).toBeNull();
    expect(coachClosingView({ tier: FREE, coachMoves: [makeLogMissedMove('Sep', 1)] }, PRICE)).toBeNull();
    expect(coachClosingView({ tier: FREE, coachMoves: [makeLogMissedMove('Sep', 1), makeCallAprMove('Citi', 0.4)] }, PRICE)).toBeNull();
  });
});

describe('openMoveRows (Coach for Pro: every move open with its action)', () => {
  it('maps each move to its action', () => {
    const rows = openMoveRows({
      tier: PRO,
      coachMoves: [makeLogMissedMove('Sep', 2, true), makeUnallocatedMove(3, true), makeSwitchMove('snowball', 90, true), makeCallAprMove('Citi', 742, true)],
    });
    expect(rows.map((r) => [r.move.id, r.cta.action, r.cta.label])).toEqual([
      ['log_missed', 'bulk_log', 'Log them now'],
      ['use_unallocated', 'apply_unallocated', 'Apply $200/mo'],
      ['switch_strategy', 'switch_strategy', 'Switch to Snowball'],
      ['call_apr', 'apr_script', 'Open the call script'],
    ]);
    expect(rows[0].priority).toBe('High');
    expect(rows[2].priority).toBe('Medium');
    expect(rows[3].copy.valueLabel).toBe('$742/yr est.');
  });

  it('uses the singular log label, and is empty for Free', () => {
    expect(openMoveRows({ tier: PRO, coachMoves: [makeLogMissedMove('Sep', 1, true)] })[0].cta.label).toBe('Log it now');
    expect(openMoveRows({ tier: FREE, coachMoves: [makeLogMissedMove('Sep', 1)] })).toEqual([]);
  });
});
