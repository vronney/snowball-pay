import { describe, it, expect } from 'vitest';
import config from '../../../tailwind.config';

type Extend = { colors: Record<string, string>; boxShadow: Record<string, string> };
const extend = config.theme?.extend as unknown as Extend;

describe('dashboard v2 design tokens (spec §8.1)', () => {
  it('adds the ink surface and its accent', () => {
    expect(extend.colors.ink).toBe('#0b1220');
    expect(extend.colors['ink-accent']).toBe('#6ee7b7');
  });

  it('adds the streak, focus-card and streak-pill colors', () => {
    expect(extend.colors['streak-miss']).toBe('#fecaca');
    expect(extend.colors['streak-miss-border']).toBe('#f87171');
    expect(extend.colors['streak-future']).toBe('#e2e8f0');
    expect(extend.colors['focus-card']).toBe('#fffbeb');
    expect(extend.colors['focus-card-border']).toBe('rgba(245,158,11,0.35)');
    expect(extend.colors['streak-pill']).toBe('#ffedd5');
    expect(extend.colors['streak-pill-text']).toBe('#7c2d12');
  });

  it('adds the four shadows', () => {
    expect(extend.boxShadow).toEqual({
      card: '0 1px 4px rgba(15,23,42,0.06)',
      float: '0 12px 34px rgba(15,23,42,0.09)',
      'cta-ink': '0 10px 24px rgba(15,23,42,0.18)',
      'cta-blue': '0 0 0 1px rgba(37,99,235,0.22), 0 0 14px rgba(37,99,235,0.2)',
    });
  });

  it('leaves existing tokens untouched', () => {
    expect(extend.colors.action).toBe('#2563eb');
    expect(extend.colors.success).toBe('#27AE60');
    expect(extend.colors.danger).toBe('#EF4444');
    expect(extend.colors.border).toBe('#E5E7EB');
  });

  it('adds an accessible green for text (DESIGN.md 2026-09-14)', () => {
    expect(extend.colors['success-text']).toBe('#15803d');
    expect(extend.colors.success).toBe('#27AE60');
  });
});
