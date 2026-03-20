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
        bg: '#0d1424',
        surface: '#131d2e',
        'surface-2': '#192538',
        txt: '#e1e8f0',
        'txt-muted': '#8899aa',
        action: '#3b82f6',
        'action-light': '#60a5fa',
        secondary: '#64748b',
        success: '#10b981',
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
