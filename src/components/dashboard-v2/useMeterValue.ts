"use client";

import { useEffect, useState } from "react";

/**
 * Meter motion (DESIGN.md 2026-09-12). The first render draws the meter at 0,
 * then the value lands after mount, so the element's CSS width transition
 * runs 0 → value once; later values animate from the previous one. Pair it
 * with `motion-reduce:transition-none`, which makes every step instant.
 */
export function useMeterValue(target: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    setValue(target);
  }, [target]);
  return value;
}
