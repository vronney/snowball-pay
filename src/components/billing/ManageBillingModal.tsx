'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CreditCard, ExternalLink, LifeBuoy, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { track, Events } from '@/lib/analytics';
import {
  CANCELLATION_REASON_OPTIONS,
  type CancellationReason,
} from '@/lib/cancellation';
import { getErrorMessage, useOpenBillingPortal } from '@/lib/hooks';

interface ManageBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Screen = 'manage' | 'cancel';

export default function ManageBillingModal({ isOpen, onClose }: ManageBillingModalProps) {
  const [screen, setScreen] = useState<Screen>('manage');
  const [reason, setReason] = useState<CancellationReason | undefined>();
  const portal = useOpenBillingPortal();
  const resetPortal = portal.reset;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const selectedOption = useMemo(
    () => CANCELLATION_REASON_OPTIONS.find((option) => option.value === reason),
    [reason],
  );
  const error = portal.isError
    ? getErrorMessage(portal.error, 'Could not open Stripe. Please try again.')
    : null;

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    headingRef.current?.focus();
  }, [isOpen, screen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !portal.isPending) onClose();
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeIsFocusable = [...focusable].includes(document.activeElement as HTMLElement);
      if (event.shiftKey && (document.activeElement === first || !activeIsFocusable)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, portal.isPending]);

  useEffect(() => {
    if (isOpen) return;
    setScreen('manage');
    setReason(undefined);
    resetPortal();
  }, [isOpen, resetPortal]);

  if (!isOpen || typeof document === 'undefined') return null;

  const openRoutineBilling = () => {
    track(Events.BILLING_PORTAL_OPENED, {
      source: 'settings_billing',
      intent: 'routine_billing',
    });
    portal.mutate(undefined);
  };

  const startCancelFlow = () => {
    setScreen('cancel');
    track(Events.CANCEL_FLOW_STARTED, { source: 'settings_billing' });
  };

  const selectReason = (nextReason: CancellationReason) => {
    setReason(nextReason);
    track(Events.CANCEL_REASON_SELECTED, {
      source: 'settings_billing',
      reason: nextReason,
    });
  };

  const keepPro = () => {
    track(Events.CANCEL_FLOW_SAVED, {
      source: 'settings_billing',
      reason: reason ?? 'not_selected',
    });
    onClose();
  };

  const continueToStripe = () => {
    track(Events.CANCEL_PORTAL_OPENED, {
      source: 'settings_billing',
      reason: reason ?? 'not_selected',
    });
    portal.mutate(reason);
  };

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !portal.isPending) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-billing-title"
        aria-describedby="manage-billing-description"
        style={{
          width: '100%',
          maxWidth: screen === 'cancel' ? '560px' : '480px',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          border: '1px solid rgba(15, 23, 42, 0.1)',
          borderRadius: '12px',
          background: '#ffffff',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.2)',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {screen === 'cancel' && (
            <button
              type="button"
              aria-label="Back to billing options"
              onClick={() => setScreen('manage')}
              disabled={portal.isPending}
              style={iconButtonStyle}
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div style={{ flex: 1 }}>
            <h2
              id="manage-billing-title"
              ref={headingRef}
              tabIndex={-1}
              style={{ margin: 0, color: '#0f172a', fontSize: '20px', fontWeight: 800 }}
            >
              {screen === 'manage' ? 'Manage Pro billing' : 'Before you cancel Pro'}
            </h2>
            <p
              id="manage-billing-description"
              style={{ margin: '7px 0 0', color: '#64748b', fontSize: '14px', lineHeight: 1.55 }}
            >
              {screen === 'manage'
                ? 'Choose what you need. Stripe securely handles payment details, invoices, and subscription changes.'
                : 'Sharing a reason is optional. It helps us decide what to improve, and you can continue to Stripe at any time.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close billing dialog"
            onClick={onClose}
            disabled={portal.isPending}
            style={iconButtonStyle}
          >
            <X size={18} />
          </button>
        </div>

        {screen === 'manage' ? (
          <div style={{ display: 'grid', gap: '10px', marginTop: '22px' }}>
            <button
              type="button"
              onClick={openRoutineBilling}
              disabled={portal.isPending}
              style={choiceButtonStyle}
            >
              <span style={choiceIconStyle}><CreditCard size={18} /></span>
              <span style={{ flex: 1 }}>
                <strong style={choiceTitleStyle}>Payment method or invoices</strong>
                <span style={choiceDescriptionStyle}>Open Stripe to update a card or view billing history.</span>
              </span>
              <ExternalLink size={16} color="#64748b" />
            </button>
            <button
              type="button"
              onClick={startCancelFlow}
              disabled={portal.isPending}
              style={choiceButtonStyle}
            >
              <span style={choiceIconStyle}><LifeBuoy size={18} /></span>
              <span style={{ flex: 1 }}>
                <strong style={choiceTitleStyle}>Cancel Pro</strong>
                <span style={choiceDescriptionStyle}>Review options, then continue to Stripe to cancel.</span>
              </span>
            </button>
          </div>
        ) : (
          <>
            <fieldset style={{ border: 0, padding: 0, margin: '22px 0 0' }}>
              <legend style={{ color: '#334155', fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>
                What is the main reason? <span style={{ color: '#94a3b8', fontWeight: 500 }}>(optional)</span>
              </legend>
              <div style={{ display: 'grid', gap: '8px' }}>
                {CANCELLATION_REASON_OPTIONS.map((option) => {
                  const selected = reason === option.value;
                  return (
                    <label
                      key={option.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: selected
                          ? '1px solid #2563eb'
                          : '1px solid rgba(15, 23, 42, 0.1)',
                        background: selected ? '#eff6ff' : '#ffffff',
                        color: '#334155',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: selected ? 700 : 500,
                      }}
                    >
                      <input
                        type="radio"
                        name="cancellation-reason"
                        value={option.value}
                        checked={selected}
                        onChange={() => selectReason(option.value)}
                        style={{ accentColor: '#2563eb' }}
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {selectedOption && (
              <div
                aria-live="polite"
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                }}
              >
                <p style={{ margin: 0, color: '#475569', fontSize: '13px', lineHeight: 1.55 }}>
                  {selectedOption.guidance}
                </p>
                {selectedOption.supportLink && (
                  <a
                    href="mailto:support@getsnowballpay.com?subject=SnowballPay%20Pro%20feedback"
                    style={{
                      display: 'inline-block',
                      marginTop: '8px',
                      color: '#2563eb',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    Email support
                  </a>
                )}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px',
              }}
            >
              <button type="button" onClick={keepPro} disabled={portal.isPending} style={secondaryButtonStyle}>
                Keep my Pro plan
              </button>
              <button type="button" onClick={continueToStripe} disabled={portal.isPending} style={primaryButtonStyle}>
                <ExternalLink size={14} />
                {portal.isPending ? 'Opening Stripe…' : 'Continue to Stripe'}
              </button>
            </div>
          </>
        )}

        {portal.isPending && screen === 'manage' && (
          <p aria-live="polite" style={{ margin: '14px 0 0', color: '#64748b', fontSize: '13px' }}>
            Opening Stripe…
          </p>
        )}
        {error && (
          <p
            role="alert"
            style={{
              margin: '14px 0 0',
              padding: '9px 10px',
              border: '1px solid rgba(185, 28, 28, 0.18)',
              borderRadius: '8px',
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: '12px',
            }}
          >
            {error}
          </p>
        )}
      </section>
    </div>,
    document.body,
  );
}

const iconButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  flexShrink: 0,
  border: '1px solid rgba(15, 23, 42, 0.1)',
  borderRadius: '8px',
  background: '#ffffff',
  color: '#64748b',
  cursor: 'pointer',
} as const;

const choiceButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  padding: '14px',
  border: '1px solid rgba(15, 23, 42, 0.1)',
  borderRadius: '12px',
  background: '#ffffff',
  color: '#334155',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'inherit',
} as const;

const choiceIconStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  flexShrink: 0,
  borderRadius: '8px',
  background: '#f1f5f9',
  color: '#475569',
} as const;

const choiceTitleStyle = {
  display: 'block',
  color: '#0f172a',
  fontSize: '14px',
  fontWeight: 700,
} as const;

const choiceDescriptionStyle = {
  display: 'block',
  marginTop: '3px',
  color: '#64748b',
  fontSize: '12px',
  lineHeight: 1.45,
} as const;

const secondaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '40px',
  padding: '9px 14px',
  border: '1px solid rgba(15, 23, 42, 0.14)',
  borderRadius: '8px',
  background: '#ffffff',
  color: '#334155',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 700,
} as const;

const primaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
  minHeight: '40px',
  padding: '9px 14px',
  border: 'none',
  borderRadius: '8px',
  background: '#2563eb',
  color: '#ffffff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 700,
} as const;
