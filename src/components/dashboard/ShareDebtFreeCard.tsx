'use client';

import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Download, Copy, X, Loader2 } from 'lucide-react';
import { track, Events } from '@/lib/analytics';

interface ShareDebtFreeCardProps {
  debtFreeDate: string;        // e.g. "March 2027"
  interestSaved: number;       // dollars
  totalDebt: number;           // original total debt
  monthsRemaining: number;
  onClose: () => void;
}

export default function ShareDebtFreeCard({
  debtFreeDate,
  interestSaved,
  totalDebt,
  monthsRemaining,
  onClose,
}: ShareDebtFreeCardProps) {
  const cardRef    = useRef<HTMLDivElement>(null);
  const [busy, setBusy]       = useState(false);
  const [copied, setCopied]   = useState(false);

  async function handleDownload() {
    if (!cardRef.current) return;
    setBusy(true);
    track(Events.SHARE_CARD_DOWNLOADED);
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(cardRef.current, { pixelRatio: 2 });
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'my-debt-free-plan.png';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const { toBlob } = await import('html-to-image');
      // Pass the Promise directly into ClipboardItem so Chrome keeps the
      // user-gesture context alive while the image is being generated.
      const blobPromise = toBlob(cardRef.current, { pixelRatio: 2 }).then((b) => {
        if (!b) throw new Error('Image capture failed');
        return b;
      });
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blobPromise }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } finally {
      setBusy(false);
    }
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const yearsLeft  = Math.floor(monthsRemaining / 12);
  const moLeft     = monthsRemaining % 12;
  const timeLabel  = yearsLeft > 0
    ? `${yearsLeft}y ${moLeft > 0 ? `${moLeft}m` : ''}`
    : `${moLeft}m`;

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share your debt-free card"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
            Your shareable card
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCopy}
              disabled={busy}
              title="Copy image"
              style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px', padding: '8px 14px', cursor: busy ? 'not-allowed' : 'pointer',
                color: '#fff', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {busy ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              disabled={busy}
              title="Download PNG"
              style={{
                background: '#2563eb', border: 'none',
                borderRadius: '8px', padding: '8px 14px', cursor: busy ? 'not-allowed' : 'pointer',
                color: '#fff', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Download size={13} />
              Download
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* The card — this is what gets captured */}
        <div
          ref={cardRef}
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
            borderRadius: '20px',
            padding: '40px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 32px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Background orbs */}
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(37,99,235,0.15)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(5,150,105,0.12)', pointerEvents: 'none' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={16} color="#93c5fd" />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              SnowballPay
            </span>
          </div>

          {/* Main message */}
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', margin: '0 0 8px', fontWeight: 500 }}>
            I&apos;m on track to be
          </p>
          <h2 style={{ fontSize: '36px', fontWeight: 900, color: '#ffffff', margin: '0 0 4px', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            Debt-Free
          </h2>
          <h3 style={{ fontSize: '28px', fontWeight: 800, color: '#60a5fa', margin: '0 0 28px', letterSpacing: '-0.03em' }}>
            by {debtFreeDate}
          </h3>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px', fontWeight: 700 }}>Interest saved</p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: '#34d399', margin: 0, letterSpacing: '-0.03em' }}>
                ${interestSaved.toLocaleString()}
              </p>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px', fontWeight: 700 }}>Time to freedom</p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: '#a78bfa', margin: 0, letterSpacing: '-0.03em' }}>
                {timeLabel}
              </p>
            </div>
            {totalDebt > 0 && (
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px', fontWeight: 700 }}>Total debt</p>
                <p style={{ fontSize: '20px', fontWeight: 900, color: '#f9a8d4', margin: 0, letterSpacing: '-0.03em' }}>
                  ${Math.round(totalDebt / 1000)}k
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0, textAlign: 'center' }}>
            getsnowballpay.com — free debt payoff planner
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
