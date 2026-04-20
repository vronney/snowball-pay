'use client';

import { useEffect } from 'react';
import { Sparkles, X, Check, Zap } from 'lucide-react';
import { getErrorMessage, useStartCheckout } from '@/lib/hooks';
import { PLANS } from '@/lib/stripe';

interface UpgradeModalProps {
  feature?: string;
  onClose: () => void;
}

export default function UpgradeModal({ feature, onClose }: UpgradeModalProps) {
  const checkout = useStartCheckout();
  const checkoutError = checkout.isError
    ? getErrorMessage(checkout.error, 'Could not start checkout. Please try again.')
    : null;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#ffffff', borderRadius: '20px',
        padding: '32px', maxWidth: '440px', width: '100%',
        boxShadow: '0 20px 60px rgba(15,23,42,0.18)',
        position: 'relative',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', padding: '4px',
          }}
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px',
        }}>
          <Sparkles size={24} color="#fff" />
        </div>

        {/* Heading */}
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
          Upgrade to Pro
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
          {feature
            ? `${feature} is a Pro feature.`
            : 'Unlock all premium features.'}{' '}
          Start your 7-day free trial — no card required until after the trial.
        </p>

        {/* Features */}
        <div style={{
          background: '#f8fafc', borderRadius: '12px',
          padding: '16px', marginBottom: '24px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          {PLANS.pro.features.map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: 'rgba(37,99,235,0.1)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={11} color="#2563eb" strokeWidth={3} />
              </div>
              <span style={{ fontSize: '13px', color: '#334155' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>${PLANS.pro.price}</span>
          <span style={{ fontSize: '14px', color: '#64748b' }}>/month after trial</span>
        </div>

        {/* CTA */}
        <button
          onClick={() => checkout.mutate()}
          disabled={checkout.isPending}
          style={{
            width: '100%', padding: '13px',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            border: 'none', borderRadius: '12px', cursor: 'pointer',
            fontSize: '15px', fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            opacity: checkout.isPending ? 0.7 : 1,
            fontFamily: 'inherit',
          }}
        >
          <Zap size={16} />
          {checkout.isPending ? 'Redirecting…' : 'Start 7-day free trial'}
        </button>

        {checkoutError && (
          <p
            role="alert"
            style={{
              margin: '10px 0 0',
              fontSize: '12px',
              color: '#b91c1c',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '8px',
              padding: '8px 10px',
            }}
          >
            {checkoutError}
          </p>
        )}

        <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '12px' }}>
          Cancel anytime. No charge during trial.
        </p>
      </div>
    </div>
  );
}
