import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'var(--font-manrope)', 'sans-serif'],
      },
      colors: {
        bg: '#F8FAFC',
        surface: '#ffffff',
        'surface-2': '#f1f5f9',
        txt: '#111827',
        'txt-muted': '#6B7280',
        action: '#2563eb',
        'action-light': '#3b82f6',
        primary: '#2F80ED',
        secondary: '#6B7280',
        success: '#27AE60',
        // Green TEXT on light surfaces: 5.0:1 on white. `success` (2.9:1) is for fills only.
        'success-text': '#15803d',
        warning: '#F59E0B',
        danger: '#EF4444',
        sidebar: '#ffffff',
        border: '#E5E7EB',
        // Dashboard v2 (2026-09-12) — see DESIGN.md decisions.
        ink: '#0b1220',
        'ink-accent': '#6ee7b7',
        'streak-miss': '#fecaca',
        'streak-miss-border': '#f87171',
        'streak-future': '#e2e8f0',
        'focus-card': '#fffbeb',
        'focus-card-border': 'rgba(245,158,11,0.35)',
        'streak-pill': '#ffedd5',
        'streak-pill-text': '#7c2d12',
      },
      keyframes: {
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(12px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.46s cubic-bezier(0.22,1,0.36,1)',
      },
      boxShadow: {
        card: '0 1px 4px rgba(15,23,42,0.06)',
        float: '0 12px 34px rgba(15,23,42,0.09)',
        'cta-ink': '0 10px 24px rgba(15,23,42,0.18)',
        'cta-blue': '0 0 0 1px rgba(37,99,235,0.22), 0 0 14px rgba(37,99,235,0.2)',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
};

export default config;
