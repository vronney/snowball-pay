import { describe, it, expect } from 'vitest';
import type { TierInfo } from '@/lib/dashboard/types';
import { computeUpgradeRail, upgradeRailCopy } from '@/lib/dashboard/upgradeRail';
import { makeCallAprMove, makeLogMissedMove, makeSwitchMove, makeUnallocatedMove } from './fixtures';

const FREE: TierInfo = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null, eligible: false } };
const PRO: TierInfo = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null, eligible: false } };

describe('computeUpgradeRail', () => {
  it('is null before insights load', () => {
    expect(computeUpgradeRail(undefined)).toBeNull();
    expect(computeUpgradeRail(null)).toBeNull();
  });

  it('is null for Pro and trial users, whose moves are all open', () => {
    expect(computeUpgradeRail({ tier: PRO, coachMoves: [makeCallAprMove('c1', 500, true)] })).toBeNull();
  });

  it('is null for Pro users even if a move arrives gated', () => {
    expect(computeUpgradeRail({ tier: PRO, coachMoves: [makeCallAprMove('c1', 500, false)] })).toBeNull();
  });

  it('is null when nothing is gated', () => {
    expect(computeUpgradeRail({ tier: FREE, coachMoves: [makeLogMissedMove('Sep', 2)] })).toBeNull();
    expect(computeUpgradeRail({ tier: FREE, coachMoves: [] })).toBeNull();
  });

  it('counts only gated moves and floors their per-year estimate', () => {
    expect(computeUpgradeRail({
      tier: FREE,
      coachMoves: [makeLogMissedMove('Sep', 2), makeUnallocatedMove(3), makeSwitchMove('avalanche', 1030.4), makeCallAprMove('c1', 742.9)],
    })).toEqual({ count: 3, perYear: 742 });
  });

  it('never adds one-time or months values into the per-year figure (X7)', () => {
    expect(computeUpgradeRail({
      tier: FREE,
      coachMoves: [makeLogMissedMove('Sep', 2), makeSwitchMove('avalanche', 1030.4), makeUnallocatedMove(2)],
    })).toEqual({ count: 2, perYear: null });
  });

  it('sums several per-year moves before flooring', () => {
    expect(computeUpgradeRail({
      tier: FREE,
      coachMoves: [makeLogMissedMove('Sep', 1), makeCallAprMove('c1', 300.6), makeCallAprMove('c2', 441.7)],
    })).toEqual({ count: 2, perYear: 742 });
  });

  it('hides a per-year total under $1', () => {
    expect(computeUpgradeRail({
      tier: FREE,
      coachMoves: [makeLogMissedMove('Sep', 1), makeCallAprMove('c1', 0.8)],
    })).toEqual({ count: 1, perYear: null });
  });
});

describe('upgradeRailCopy', () => {
  it('names the count, the per-year estimate, and the CTA', () => {
    expect(upgradeRailCopy({ count: 3, perYear: 1648 })).toEqual({
      title: '3 moves waiting',
      value: '$1,648/yr est.',
      cta: 'Unlock all 3',
    });
  });

  it('uses the singular and drops a missing value', () => {
    expect(upgradeRailCopy({ count: 1, perYear: null })).toEqual({
      title: '1 move waiting',
      value: null,
      cta: 'Unlock the move',
    });
  });
});

describe('upgradeRailCopy for an account that can start the trial (README §6; plan decision 8)', () => {
  it('invites a trial instead of an unlock, keeping the count and the value', () => {
    expect(upgradeRailCopy({ count: 3, perYear: 742 }, true)).toEqual({
      title: '3 moves waiting',
      value: '$742/yr est.',
      cta: 'Try Pro free',
    });
    expect(upgradeRailCopy({ count: 3, perYear: 742 }).cta).toBe('Unlock all 3');
  });
});
