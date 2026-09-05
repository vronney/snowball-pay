'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { CONSENT_BANNER_OFFSET_VAR } from '@/components/analytics/AnalyticsConsentBanner';

interface MobileResultBarProps {
  timeStr: string;
  totalInterest: number;
  /** The results panel container — the bar hides once it scrolls into view. */
  resultsRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Sticky bottom bar for < lg viewports, where the results panel stacks
 * several screens below the inputs. Keeps the payoff date AND the total
 * interest figure on screen while the user types, so every edit gets
 * visible feedback and the interest number anchors the later save ask.
 */
export default function MobileResultBar({
  timeStr,
  totalInterest,
  resultsRef,
}: MobileResultBarProps) {
  const [resultsInView, setResultsInView] = useState(false);
  // Whether the (out-of-view) panel sits above the viewport — the user has
  // scrolled past it into the FAQ/content, so the arrow must point up.
  const [resultsAbove, setResultsAbove] = useState(false);

  useEffect(() => {
    const node = resultsRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    // threshold 0: the ratio compares against the OBSERVED element's height,
    // and the results panel is taller than a phone viewport — a fractional
    // threshold can become unreachable, leaving the bar stuck over the panel.
    const observer = new IntersectionObserver(
      ([entry]) => {
        setResultsInView(entry.isIntersecting);
        setResultsAbove(entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [resultsRef]);

  if (resultsInView) return null;

  return (
    <div
      className="lg:hidden fixed inset-x-0 z-40 flex items-center justify-between gap-3 px-4 py-3"
      style={{
        // Rides above the analytics consent banner while that is on screen
        // (it publishes its height into this variable) and sits on the
        // viewport edge once the visitor has answered it.
        bottom: `var(${CONSENT_BANNER_OFFSET_VAR}, 0px)`,
        background: '#ffffff',
        borderTop: '1px solid rgba(15,23,42,0.10)',
        boxShadow: '0 -8px 24px rgba(15,23,42,0.10)',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
      }}
    >
      <div className="min-w-0">
        <p
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#64748b',
            margin: 0,
          }}
        >
          Debt-free in
        </p>
        <p className="truncate" style={{ margin: 0 }}>
          <span
            className="mono"
            style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}
          >
            {timeStr}
          </span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {' '}
            · {formatCurrency(totalInterest)} interest
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={() =>
          resultsRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        }
        className="flex-shrink-0"
        style={{
          padding: '10px 16px',
          borderRadius: '8px',
          background: '#2563eb',
          color: '#ffffff',
          border: 'none',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        See plan {resultsAbove ? '↑' : '↓'}
      </button>
    </div>
  );
}
