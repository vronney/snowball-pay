'use client';

import { useEffect, useState } from 'react';

export interface CelebrationData {
  message: string;
  debtName: string;
  milestoneLabel: string | null;
}

type Listener = (data: CelebrationData | null) => void;

let current: CelebrationData | null = null;
const listeners = new Set<Listener>();

export function triggerCelebration(data: CelebrationData) {
  current = data;
  listeners.forEach((l) => l(current));
}

export function dismissCelebration() {
  current = null;
  listeners.forEach((l) => l(null));
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCelebrationStore(): CelebrationData | null {
  const [data, setData] = useState<CelebrationData | null>(current);

  useEffect(() => {
    setData(current);
    return subscribe(setData);
  }, []);

  return data;
}
