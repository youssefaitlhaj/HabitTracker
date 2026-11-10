/** Design tokens from the design document, section 7.1. Single source of truth for colours. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      tablet: '768px',
      desktop: '1200px',
    },
    extend: {
      colors: {
        paper: '#F4EEE2',
        surface: '#FBF8F2',
        oat: '#EFE7D8',
        'oat-deep': '#EADFCB',
        line: '#E2D7C4',
        'line-soft': '#EAE1D0',
        'line-strong': '#CDBFA8',
        ink: '#2E1C10',
        muted: '#6B5643',
        whisky: '#A0521D',
        oak: '#7A3E14',
        cask: '#3A2416',
        'cask-soft': '#E9DFCC',
        amber: '#E8B67A',
        success: { DEFAULT: '#4E6B2A', soft: '#E6EDD8', ink: '#2B3D16' },
        warning: { DEFAULT: '#8A5A00', soft: '#F7E8C6', ink: '#5C3C00' },
        error: { DEFAULT: '#A1311F', soft: '#F7E1DA', ink: '#7E2617', line: '#E7B9AE' },
        heat: {
          0: '#E6DCCB',
          1: '#EBCFA8',
          2: '#D9A066',
          3: '#9A4E1B',
          4: '#5E2F10',
        },
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        sans: ['"Geist Variable"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        field: '12px',
        card: '20px',
        dialog: '24px',
      },
      boxShadow: {
        lift: '0 1px 2px rgba(58, 36, 22, 0.15)',
        dialog: '0 24px 64px rgba(42, 26, 15, 0.35)',
        toast: '0 16px 40px rgba(42, 26, 15, 0.30), 0 0 0 1px rgba(232, 182, 122, 0.14)',
        pop: '0 16px 40px rgba(42, 26, 15, 0.20)',
      },
      keyframes: {
        'toast-in': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        'toast-bar': { from: { transform: 'scaleX(1)' }, to: { transform: 'scaleX(0)' } },
        'pop-in': { from: { opacity: '0', transform: 'translateY(6px) scale(.98)' }, to: { opacity: '1', transform: 'none' } },
        'sheet-in': { from: { opacity: '0', transform: 'translateY(40px)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { '0%': { backgroundPosition: '-200px 0' }, '100%': { backgroundPosition: '200px 0' } },
        glow: { '0%, 100%': { filter: 'none' }, '50%': { filter: 'drop-shadow(0 0 10px rgba(232,182,122,.9))' } },
      },
      animation: {
        'toast-in': 'toast-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'pop-in': 'pop-in 180ms ease-out',
        'sheet-in': 'sheet-in 220ms ease-out',
        shimmer: 'shimmer 1.2s linear infinite',
        glow: 'glow 1.2s ease-in-out 2',
      },
    },
  },
  plugins: [],
};
