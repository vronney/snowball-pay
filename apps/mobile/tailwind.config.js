/** Design tokens transcribed from ../../DESIGN.md ("Clean Signal"). */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#f8fafc',
        surface: '#ffffff',
        primary: { DEFAULT: '#2563eb', hover: '#1d4ed8' },
        tint: { DEFAULT: '#eff6ff', border: '#bfdbfe' },
        ink: '#0f172a',
        muted: '#64748b',
        faint: '#94a3b8',
        line: '#e2e8f0',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      // Hierarchical radii — never uniform (DESIGN.md).
      borderRadius: {
        card: '12px',
        input: '8px',
        button: '8px',
        tag: '6px',
      },
      // React Native picks weight by font file, so each weight is a family.
      fontFamily: {
        body: ['PlusJakartaSans_400Regular'],
        medium: ['PlusJakartaSans_500Medium'],
        semibold: ['PlusJakartaSans_600SemiBold'],
        bold: ['PlusJakartaSans_700Bold'],
        display: ['PlusJakartaSans_800ExtraBold'],
      },
    },
  },
  plugins: [],
};
