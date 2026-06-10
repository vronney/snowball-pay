import type { CSSProperties } from 'react';

/**
 * Design tokens transcribed from DESIGN.md ("Clean Signal").
 * Visual decisions live in DESIGN.md — this module only encodes them so
 * components stop re-declaring the same style blobs inline.
 */

export const color = {
  bg: '#f8fafc',
  surface: '#ffffff',
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  tint: '#eff6ff',
  tintBorder: '#bfdbfe',
  text: '#0f172a',
  muted: '#64748b',
  faint: '#94a3b8',
  border: '#e2e8f0',
  success: '#10b981',
  successDeep: '#059669',
  warning: '#f59e0b',
  error: '#ef4444',
} as const;

/** Border radius is hierarchical (DESIGN.md): never uniform across elements. */
export const radius = {
  card: 12,
  input: 8,
  button: 8,
  tag: 6,
  pill: 9999,
} as const;

export const easing = {
  enter: 'cubic-bezier(0,0,0.2,1)',
  exit: 'cubic-bezier(0.4,0,1,1)',
  /** All win-moment animations use this curve. */
  celebrate: 'cubic-bezier(0.22,1,0.36,1)',
} as const;

/** The standard white card surface used across the dashboard. */
export const cardSurface: CSSProperties = {
  background: color.surface,
  border: '1px solid rgba(15,23,42,0.08)',
  borderRadius: `${radius.card}px`,
  boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
};

/** Tabular numbers for dollar amounts — digits align vertically. */
export const monoNums: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
};

/** Primary CTA button (DESIGN.md: blue lives only on actions/progress). */
export const primaryButton: CSSProperties = {
  background: color.primary,
  color: '#ffffff',
  border: 'none',
  borderRadius: `${radius.button}px`,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background 0.2s',
};

/** Quiet secondary button for non-primary actions. */
export const quietButton: CSSProperties = {
  background: 'rgba(15,23,42,0.04)',
  color: color.muted,
  border: '1px solid rgba(15,23,42,0.08)',
  borderRadius: `${radius.button}px`,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.2s',
};
