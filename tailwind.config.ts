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
        sans: ['var(--font-outfit)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        bg: '#f5f7fa',
        surface: '#ffffff',
        'surface-2': '#f1f5f9',
        txt: '#0f172a',
        'txt-muted': '#64748b',
        action: '#2563eb',
        'action-light': '#3b82f6',
        secondary: '#64748b',
        success: '#10b981',
        sidebar: '#ffffff',
        border: 'rgba(15,23,42,0.08)',
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
