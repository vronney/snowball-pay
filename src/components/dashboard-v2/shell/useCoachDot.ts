"use client";

import { useEffect, useMemo, useState } from "react";
import type { CoachMove } from "@/lib/dashboard/types";
import {
  COACH_SEEN_STORAGE_KEY,
  coachMovesFingerprint,
  shouldShowCoachDot,
} from "@/lib/dashboard/coachDot";

function readSeen(): string | null {
  try {
    return localStorage.getItem(COACH_SEEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Coach dot (spec §8.3): on while the current move set differs from the last
 * one seen on Coach; opening Coach marks it seen. If storage is blocked, the
 * in-memory state still clears the dot for this session.
 */
export function useCoachDot(moves: ReadonlyArray<CoachMove> | undefined, coachOpen: boolean): boolean {
  const fingerprint = useMemo(() => (moves ? coachMovesFingerprint(moves) : null), [moves]);
  const [lastSeen, setLastSeen] = useState<string | null>(readSeen);

  useEffect(() => {
    if (!coachOpen || fingerprint === null) return;
    setLastSeen(fingerprint);
    try {
      localStorage.setItem(COACH_SEEN_STORAGE_KEY, fingerprint);
    } catch {
      // Storage blocked: the state above keeps the dot cleared this session.
    }
  }, [coachOpen, fingerprint]);

  return !coachOpen && shouldShowCoachDot(fingerprint, lastSeen);
}
