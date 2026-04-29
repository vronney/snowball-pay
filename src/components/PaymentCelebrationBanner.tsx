'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, X, Share2, Download } from 'lucide-react';
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

const MILESTONE_DISPLAY: Record<string, string> = {
  first_payment:     'First payment!',
  debt_paid_off:     'Debt paid off!',
  quarter_paid:      '25% paid down',
  half_paid:         '50% paid down',
  three_quarter:     '75% paid down',
  streak_six_months: '6-month streak',
  anniversary:       '1-year anniversary',
};

export default function PaymentCelebrationBanner() {
  const { data, isLoading } = useCelebrationStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'done'>('idle');

  // All hooks must be called unconditionally, before any early returns
  const buildOgUrl = useCallback(() => {
    const d = data;
    if (!d) return '/api/og/debt-payoff';
    const params = new URLSearchParams({
      name:   d.debtName,
      msg:    d.message,
      paid:   String(Math.round(d.paidTotal ?? 0)),
      months: String(d.monthsElapsed ?? 0),
    });
    return `/api/og/debt-payoff?${params.toString()}`;
  }, [data]);

  const handleShare = useCallback(async () => {
    setShareState('loading');
    try {
      const url = buildOgUrl();
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], 'debt-paid-off.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${data?.debtName ?? ''} — Debt Free!` });
      } else {
        window.open(url, '_blank');
      }
      setShareState('done');
      setTimeout(() => setShareState('idle'), 3000);
    } catch {
      setShareState('idle');
    }
  }, [buildOgUrl, data]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (data) {
      // debt_paid_off: no auto-dismiss — user must act (share/close)
      if (data.milestoneLabel === 'debt_paid_off') return;

      const dismissMs = data.milestoneLabel ? 8000 : 5000;
      timerRef.current = setTimeout(() => { dismissCelebration(); }, dismissMs);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data]);

  if (!data && !isLoading) return null;

  // Loading shimmer — shown while the Claude call is in-flight (1-2s)
  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading celebration message"
        style={{
          borderRadius: '14px',
          padding: '14px 16px',
          background: 'linear-gradient(135deg, #2563eb18, #2563eb08)',
          border: '1px solid #2563eb30',
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
            background: '#2563eb18',
            border: '1px solid #2563eb30',
            flexShrink: 0,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              height: '13px',
              borderRadius: '6px',
              background: '#e2e8f0',
              width: '75%',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              height: '13px',
              borderRadius: '6px',
              background: '#e2e8f0',
              width: '50%',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: '0.15s',
            }}
          />
        </div>
      </div>
    );
  }

  const accentColor = data!.milestoneLabel
    ? (MILESTONE_COLORS[data!.milestoneLabel] ?? '#8b5cf6')
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
        {data!.milestoneLabel && (
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
            {MILESTONE_DISPLAY[data!.milestoneLabel] ?? data!.milestoneLabel}
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
          {data!.message}
        </p>
        {data!.highlightStat && (
          <p
            style={{
              fontSize: '12px',
              color: '#64748b',
              margin: '4px 0 0',
              fontWeight: 500,
            }}
          >
            {data!.highlightStat}
          </p>
        )}

        {data!.milestoneLabel === 'debt_paid_off' && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleShare}
              disabled={shareState === 'loading'}
              aria-label="Share your payoff card"
              style={{
                display:      'inline-flex',
                alignItems:   'center',
                gap:          '5px',
                fontSize:     '12px',
                fontWeight:   600,
                color:        '#ffffff',
                background:   accentColor,
                border:       'none',
                borderRadius: '8px',
                padding:      '6px 12px',
                cursor:       shareState === 'loading' ? 'default' : 'pointer',
                opacity:      shareState === 'loading' ? 0.7 : 1,
                fontFamily:   'inherit',
              }}
            >
              <Share2 size={12} />
              {shareState === 'done' ? 'Shared!' : shareState === 'loading' ? 'Sharing…' : 'Share'}
            </button>
            <a
              href={buildOgUrl()}
              download="debt-paid-off.png"
              aria-label="Download your payoff card"
              style={{
                display:      'inline-flex',
                alignItems:   'center',
                gap:          '5px',
                fontSize:     '12px',
                fontWeight:   600,
                color:        accentColor,
                background:   `${accentColor}14`,
                border:       `1px solid ${accentColor}30`,
                borderRadius: '8px',
                padding:      '6px 12px',
                cursor:       'pointer',
                textDecoration: 'none',
                fontFamily:   'inherit',
              }}
            >
              <Download size={12} />
              Save
            </a>
          </div>
        )}
      </div>

      <button
        onClick={dismissCelebration}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          padding: '10px',
          cursor: 'pointer',
          color: '#94a3b8',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          margin: '-10px -10px 0 0',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
