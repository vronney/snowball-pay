import { describe, it, expect } from 'vitest';
import {
  COACH_SEEN_STORAGE_KEY,
  coachMovesFingerprint,
  shouldShowCoachDot,
} from '@/lib/dashboard/coachDot';
import { makeCallAprMove, makeLogMissedMove, makeSwitchMove, makeUnallocatedMove } from './fixtures';

describe('coachMovesFingerprint', () => {
  it('ignores amounts, so a payment that nudges an estimate is not a new move', () => {
    expect(coachMovesFingerprint([makeCallAprMove('card-1', 742.9)]))
      .toBe(coachMovesFingerprint([makeCallAprMove('card-1', 700.1)]));
    expect(coachMovesFingerprint([makeLogMissedMove('Sep', 2)]))
      .toBe(coachMovesFingerprint([makeLogMissedMove('Sep', 3)]));
  });

  it('ignores order', () => {
    const a = [makeLogMissedMove('Sep', 2), makeCallAprMove('card-1', 500)];
    expect(coachMovesFingerprint(a)).toBe(coachMovesFingerprint([...a].reverse()));
  });

  it('changes for a new month, a different card, a different alternative, or an added move', () => {
    const base = coachMovesFingerprint([makeLogMissedMove('Sep', 2), makeCallAprMove('card-1', 500)]);
    expect(coachMovesFingerprint([makeLogMissedMove('Oct', 2), makeCallAprMove('card-1', 500)])).not.toBe(base);
    expect(coachMovesFingerprint([makeLogMissedMove('Sep', 2), makeCallAprMove('card-2', 500)])).not.toBe(base);
    expect(coachMovesFingerprint([makeLogMissedMove('Sep', 2), makeCallAprMove('card-1', 500), makeUnallocatedMove(2)])).not.toBe(base);
    expect(coachMovesFingerprint([makeSwitchMove('avalanche', 10)])).not.toBe(coachMovesFingerprint([makeSwitchMove('snowball', 10)]));
  });

  it('is empty for no moves', () => {
    expect(coachMovesFingerprint([])).toBe('');
  });

  it('pins the format', () => {
    expect(coachMovesFingerprint([
      makeSwitchMove('avalanche', 10), makeLogMissedMove('Sep', 1), makeUnallocatedMove(2), makeCallAprMove('c1', 5),
    ])).toBe('call_apr:c1|log_missed:Sep|switch_strategy:avalanche|use_unallocated');
  });
});

describe('shouldShowCoachDot', () => {
  it('is off while moves are unknown or empty', () => {
    expect(shouldShowCoachDot(null, null)).toBe(false);
    expect(shouldShowCoachDot('', null)).toBe(false);
  });

  it('is on for a move set never seen, off once seen', () => {
    expect(shouldShowCoachDot('log_missed:Sep', null)).toBe(true);
    expect(shouldShowCoachDot('log_missed:Sep', 'call_apr:c1')).toBe(true);
    expect(shouldShowCoachDot('log_missed:Sep', 'log_missed:Sep')).toBe(false);
  });
});

it('stores under an sp_ key so sign-out clears it (logout-client.ts)', () => {
  expect(COACH_SEEN_STORAGE_KEY).toBe('sp_coach_seen');
});
