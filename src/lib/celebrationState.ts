'use client';

import { useEffect, useState } from 'react';
import type { MilestoneTier } from '@/lib/milestoneDetection';

export interface CelebrationData {
  message: string;
  debtName: string;
  milestoneLabel: MilestoneTier;
  highlightStat: string;
}

export interface CelebrationState {
  data: CelebrationData | null;
  isLoading: boolean;
}

type Listener = (state: CelebrationState) => void;

let state: CelebrationState = { data: null, isLoading: false };
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l(state));
}

export function triggerCelebrationLoading() {
  state = { data: null, isLoading: true };
  notify();
}

export function triggerCelebration(data: CelebrationData) {
  state = { data, isLoading: false };
  notify();
}

export function dismissCelebration() {
  state = { data: null, isLoading: false };
  notify();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCelebrationStore(): CelebrationState {
  const [current, setCurrent] = useState<CelebrationState>(state);

  useEffect(() => {
    setCurrent(state);
    return subscribe(setCurrent);
  }, []);

  return current;
}
