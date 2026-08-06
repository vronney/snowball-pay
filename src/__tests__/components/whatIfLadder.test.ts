import { describe, expect, it } from 'vitest';
import {
  isRungApplicable,
  ladderHeadroom,
  rungCaption,
} from '@/components/payoff/whatIfLadder';

/**
 * The ladder offers one-click apply, and apply clamps to available cash flow.
 * So the tile and the outcome can disagree: a rung the user can't afford would
 * promise "1y 7m sooner" and then deliver a fraction of it. These pin the rules
 * that keep the tile and the click honest.
 */

describe('ladderHeadroom', () => {
  it('is the room left after what is already committed', () => {
    expect(ladderHeadroom(300, 100)).toBe(200);
  });

  it('floors at zero rather than going negative when over-committed', () => {
    // Acceleration above available cash flow happens after an income drop;
    // a negative headroom would make the shortfall copy read backwards.
    expect(ladderHeadroom(100, 300)).toBe(0);
  });

  it('treats unknown cash-flow data as unconstrained, not as zero room', () => {
    // These arrive as optional props. Defaulting to zero would disable every
    // rung on a plan that simply hasn't reported its cash flow.
    expect(ladderHeadroom(undefined, 100)).toBe(Infinity);
    expect(ladderHeadroom(300, undefined)).toBe(Infinity);
    expect(ladderHeadroom(undefined, undefined)).toBe(Infinity);
  });
});

describe('isRungApplicable', () => {
  it('allows a rung that fits the headroom exactly', () => {
    expect(isRungApplicable(200, 200, true, 100)).toBe(true);
  });

  it('refuses a rung one dollar past the headroom', () => {
    expect(isRungApplicable(201, 200, true, 100)).toBe(false);
  });

  it('refuses every rung when there is no handler to apply it', () => {
    expect(isRungApplicable(25, Infinity, false, 100)).toBe(false);
  });

  it('refuses when acceleration is unknown, since apply cannot compute a target', () => {
    expect(isRungApplicable(25, Infinity, true, undefined)).toBe(false);
  });
});

describe('rungCaption', () => {
  const rung = (over: Partial<Parameters<typeof rungCaption>[0]> = {}) => ({
    delta: 100,
    savedMonths: 6,
    savedInterest: 1200,
    ...over,
  });

  it('names the shortfall for an out-of-reach rung', () => {
    expect(rungCaption(rung({ delta: 200 }), 75, false)).toBe(
      'needs $125 more room',
    );
  });

  it('falls back to the outcome when a rung is inert but has unlimited headroom', () => {
    // Inapplicable with Infinity headroom is reachable: no apply handler, or an
    // unknown acceleration. Deriving the copy from the flag alone rendered a
    // shortfall of -Infinity here.
    const caption = rungCaption(rung(), Infinity, false);
    expect(caption).toBe('6m sooner · saves $1,200');
    expect(caption).not.toContain('room');
    expect(caption).not.toContain('∞');
    expect(caption).not.toContain('NaN');
  });

  it('falls back to the outcome when headroom is finite but not binding', () => {
    // delta 100 against 500 of room — inert for some other reason, and a
    // "needs -$400 more room" caption would be nonsense.
    const caption = rungCaption(rung({ delta: 100 }), 500, false);
    expect(caption).toBe('6m sooner · saves $1,200');
    expect(caption).not.toContain('room');
  });

  it('reports both improvements when both are real', () => {
    expect(rungCaption(rung({ savedMonths: 6, savedInterest: 1200 }), Infinity, true))
      .toBe('6m sooner · saves $1,200');
  });

  it('reports interest alone when the payoff month does not move', () => {
    // The common case for a small rung: it trims interest without clearing a
    // whole extra month. Claiming "0m sooner" would be noise.
    expect(rungCaption(rung({ savedMonths: 0, savedInterest: 340 }), Infinity, true))
      .toBe('saves $340');
  });

  it('reports months alone when interest does not improve', () => {
    expect(rungCaption(rung({ savedMonths: 3, savedInterest: 0 }), Infinity, true))
      .toBe('3m sooner');
  });

  it('claims nothing when nothing improved', () => {
    expect(rungCaption(rung({ savedMonths: 0, savedInterest: 0 }), Infinity, true))
      .toBe('no change');
  });

  it('never reports a saving from a negative delta', () => {
    // savedMonths goes negative if a rung somehow lands slower than the
    // committed plan; that must not be rendered as an improvement.
    expect(rungCaption(rung({ savedMonths: -2, savedInterest: 0 }), Infinity, true))
      .toBe('no change');
  });
});
