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
        sans: ['var(--font-inter)', 'var(--font-outfit)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
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
        warning: '#F59E0B',
        danger: '#EF4444',
        sidebar: '#ffffff',
        border: '#E5E7EB',
      },
      keyframes: {
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(12px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.3s ease-out',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
};

export default config;
