import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONSENT_REVEAL_FALLBACK_MS,
  ENGAGEMENT_EVENTS,
  subscribeToEngagement,
} from '@/components/analytics/AnalyticsConsentBanner';

type Listener = () => void;

/** A stand-in for `window` that records listeners so tests can fire them. */
function fakeTarget() {
  const listeners = new Map<string, Set<Listener>>();
  return {
    addEventListener: vi.fn((type: string, fn: Listener) => {
      listeners.set(type, (listeners.get(type) ?? new Set()).add(fn));
    }),
    removeEventListener: vi.fn((type: string, fn: Listener) => {
      listeners.get(type)?.delete(fn);
    }),
    fire(type: string) {
      listeners.get(type)?.forEach((fn) => fn());
    },
    count(type: string) {
      return listeners.get(type)?.size ?? 0;
    },
  };
}

describe('subscribeToEngagement', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('waits for scroll, click, and key input so the prompt never covers the hero on a cold load', () => {
    expect([...ENGAGEMENT_EVENTS]).toEqual(['scroll', 'click', 'keydown']);
  });

  it('does not listen for pointerdown, so a tap in its footprint completes before it mounts', () => {
    expect([...ENGAGEMENT_EVENTS]).not.toContain('pointerdown');
  });

  it.each([...ENGAGEMENT_EVENTS])('reveals once on the first %s and then stops listening', (event) => {
    const target = fakeTarget();
    const onEngaged = vi.fn();
    subscribeToEngagement(target, onEngaged);

    target.fire(event);
    target.fire(event);
    vi.advanceTimersByTime(CONSENT_REVEAL_FALLBACK_MS * 2);

    expect(onEngaged).toHaveBeenCalledTimes(1);
    for (const type of ENGAGEMENT_EVENTS) expect(target.count(type)).toBe(0);
  });

  it('reveals after the fallback delay when the visitor just reads', () => {
    const target = fakeTarget();
    const onEngaged = vi.fn();
    subscribeToEngagement(target, onEngaged);

    vi.advanceTimersByTime(CONSENT_REVEAL_FALLBACK_MS - 1);
    expect(onEngaged).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onEngaged).toHaveBeenCalledTimes(1);

    // A later interaction must not fire it a second time.
    target.fire('scroll');
    expect(onEngaged).toHaveBeenCalledTimes(1);
  });

  it('never fires after cleanup, from either the events or the timer', () => {
    const target = fakeTarget();
    const onEngaged = vi.fn();
    const cleanup = subscribeToEngagement(target, onEngaged);

    cleanup();
    target.fire('click');
    vi.advanceTimersByTime(CONSENT_REVEAL_FALLBACK_MS * 2);

    expect(onEngaged).not.toHaveBeenCalled();
    for (const type of ENGAGEMENT_EVENTS) expect(target.count(type)).toBe(0);
  });

  it('gives a reader long enough to see the hero before the fallback', () => {
    expect(CONSENT_REVEAL_FALLBACK_MS).toBeGreaterThanOrEqual(5000);
  });
});
