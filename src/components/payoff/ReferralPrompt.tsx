'use client';

import { useState, useEffect } from 'react';
import { Share2, X, Copy, Check } from 'lucide-react';
import { track, Events } from '@/lib/analytics';

const STORAGE_KEY = 'sp_referral_dismissed';
const REFERRAL_URL = 'https://getsnowballpay.com';

interface ReferralPromptProps {
  /** Show only after this many seconds of viewing the plan */
  delaySeconds?: number;
}

export default function ReferralPrompt({ delaySeconds = 8 }: ReferralPromptProps) {
  const [visible, setVisible]   = useState(false);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    // Never show if already dismissed
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch { /* ignore */ }

    const tid = setTimeout(() => setVisible(true), delaySeconds * 1000);
    return () => clearTimeout(tid);
  }, [delaySeconds]);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(REFERRAL_URL);
      setCopied(true);
      track(Events.REFERRAL_LINK_COPIED);
      setTimeout(() => setCopied(false), 2500);
      setTimeout(dismiss, 3000);
    } catch { /* clipboard unavailable */ }
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '14px',
        border: '1px solid rgba(37,99,235,0.18)',
        background: 'linear-gradient(135deg, rgba(37,99,235,0.05) 0%, rgba(5,150,105,0.04) 100%)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      {/* Dismiss */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          position: 'absolute', top: '10px', right: '10px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#94a3b8', padding: '2px', display: 'flex',
          borderRadius: '4px', lineHeight: 1,
        }}
      >
        <X size={13} />
      </button>

      {/* Icon */}
      <div
        style={{
          flexShrink: 0,
          width: '40px', height: '40px',
          borderRadius: '10px',
          background: 'rgba(37,99,235,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Share2 size={18} color="#2563eb" />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>
          Know someone with debt?
        </p>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Share SnowballPay — it&apos;s free and takes 30 seconds to set up.
        </p>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleCopy}
        style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(37,99,235,0.25)',
          background: copied ? 'rgba(5,150,105,0.08)' : 'rgba(37,99,235,0.08)',
          color: copied ? '#059669' : '#2563eb',
          fontSize: '13px', fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? 'Link copied!' : 'Copy link'}
      </button>
    </div>
  );
}
