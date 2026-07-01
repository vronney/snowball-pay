'use client';

import React, { useEffect, useRef, useState } from 'react';

interface PlaidErrorAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface PlaidErrorProps {
  title: string;
  message: string;
  onDismiss: () => void;
  actions?: PlaidErrorAction[];
  type?: 'error' | 'warning' | 'info';
}

/**
 * PlaidError shows error/warning banners for Plaid Link failures.
 * Auto-dismisses after 8 seconds.
 */
export default function PlaidError({
  title,
  message,
  onDismiss,
  actions,
  type = 'error',
}: PlaidErrorProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Keep the latest onDismiss in a ref so the 8s auto-dismiss timer isn't
  // reset by parent re-renders (the callback is recreated every render).
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismissRef.current();
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const colorMap = {
    error: {
      bg: '#fef2f2',
      border: '#ef4444',
      icon: '#ef4444',
      title: '#ef4444',
    },
    warning: {
      bg: '#fffbeb',
      border: '#f59e0b',
      icon: '#f59e0b',
      title: '#f59e0b',
    },
    info: {
      bg: '#f0f9ff',
      border: '#0ea5e9',
      icon: '#0ea5e9',
      title: '#0ea5e9',
    },
  };

  const colors = colorMap[type];

  return (
    <div
      className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border p-4 shadow-lg"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        animation: 'slideInDown 300ms cubic-bezier(0, 0, 0.2, 1)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center text-lg"
          style={{ color: colors.icon }}
        >
          {type === 'error' && '✕'}
          {type === 'warning' && '⚠'}
          {type === 'info' && 'ℹ'}
        </div>

        <div className="flex-1">
          <h3
            className="text-base font-bold"
            style={{ color: colors.title }}
          >
            {title}
          </h3>
          <p
            className="mt-1 text-sm"
            style={{ color: '#64748b' }}
          >
            {message}
          </p>

          {actions && actions.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    action.onClick();
                    setIsVisible(false);
                  }}
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    action.variant === 'secondary'
                      ? 'border border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a] hover:bg-[#f1f5f9]'
                      : 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'
                  }`}
                  style={{ outlineColor: '#93c5fd' }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setIsVisible(false);
            onDismiss();
          }}
          aria-label="Dismiss"
          className="mt-0.5 flex-shrink-0 rounded-lg p-1 transition-colors"
          style={{
            color: colors.icon,
          }}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
