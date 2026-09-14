import type { CoachMove } from './types';

/**
 * localStorage key for the move set the user last saw on Coach. The `sp_`
 * prefix means sign-out clears it (`runLogoutClientCleanup`), so a card id
 * never outlives the session on a shared device.
 */
export const COACH_SEEN_STORAGE_KEY = 'sp_coach_seen';

function moveIdentity(move: CoachMove): string {
  switch (move.id) {
    case 'log_missed':
      return `log_missed:${move.facts.monthLabel}`;
    case 'use_unallocated':
      return 'use_unallocated';
    case 'switch_strategy':
      return `switch_strategy:${move.facts.alternative}`;
    case 'call_apr':
      return `call_apr:${move.facts.debtId}`;
  }
}

/**
 * Identifies the move set, not its amounts: a payment that nudges an estimate
 * isn't a new move, but a new month's missed payments, a different card to
 * call, or a new kind of move is. Order-independent. '' when there are none.
 */
export function coachMovesFingerprint(moves: ReadonlyArray<CoachMove>): string {
  return moves.map(moveIdentity).sort().join('|');
}

/** The dot shows while there are moves whose set the user hasn't seen on Coach. */
export function shouldShowCoachDot(fingerprint: string | null, lastSeen: string | null): boolean {
  return fingerprint !== null && fingerprint !== '' && fingerprint !== lastSeen;
}
