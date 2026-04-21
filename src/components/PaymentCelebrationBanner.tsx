'use client';

import { useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useCelebrationStore, dismissCelebration } from '@/lib/celebrationState';

const MILESTONE_COLORS: Record<string, string> = {
  first_payment:     '#8b5cf6',
  debt_paid_off:     '#10b981',
  quarter_paid:      '#2563eb',
  half_paid:         '#0891b2',
  three_quarter:     '#f59e0b',
  streak_six_months: '#ec4899',
  anniversary:       '#8b5cf6',
};

export default function PaymentCelebrationBanner() {
  const data = useCelebrationStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (data) {
      timerRef.current = setTimeout(() => {
        dismissCelebration();
      }, 6000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data]);

  if (!data) return null;

  const accentColor = data.milestoneLabel
    ? (MILESTONE_COLORS[data.milestoneLabel] ?? '#8b5cf6')
    : '#2563eb';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        borderRadius: '14px',
        padding: '14px 16px',
        background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`,
        border: `1px solid ${accentColor}30`,
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        animation: 'slideUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '10px',
          background: `${accentColor}18`,
          border: `1px solid ${accentColor}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '1px',
        }}
      >
        <Sparkles size={15} style={{ color: accentColor }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {data.milestoneLabel && (
          <span
            style={{
              display: 'inline-block',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: accentColor,
              background: `${accentColor}14`,
              padding: '2px 7px',
              borderRadius: '4px',
              marginBottom: '5px',
            }}
          >
            {MILESTONE_DISPLAY[data.milestoneLabel] ?? data.milestoneLabel}
          </span>
        )}
        <p
          style={{
            fontSize: '13px',
            lineHeight: 1.5,
            color: '#1e293b',
            margin: 0,
            fontWeight: 500,
          }}
        >
          {data.message}
        </p>
      </div>

      <button
        onClick={dismissCelebration}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          padding: '2px',
          cursor: 'pointer',
          color: '#94a3b8',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

const MILESTONE_DISPLAY: Record<string, string> = {
  first_payment:     'First payment!',
  debt_paid_off:     'Debt paid off!',
  quarter_paid:      '25% paid down',
  half_paid:         '50% paid down',
  three_quarter:     '75% paid down',
  streak_six_months: '6-month streak',
  anniversary:       '1-year anniversary',
};
