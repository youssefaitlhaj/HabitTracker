/**
 * Design tokens (design §7.1). Values live in src/index.css as CSS variables (light + dark);
 * this file only maps token names to them, so every colour switches with the theme.
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const tokens = (names) => Object.fromEntries(names.map((n) => [n, token(n)]));

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
        ...tokens([
          'paper', 'surface', 'field', 'oat', 'oat-deep', 'line', 'line-soft', 'line-strong', 'control',
          'ink', 'muted', 'whisky', 'oak', 'on-accent', 'cask', 'on-cask', 'on-cask-muted', 'cask-soft',
          'amber', 'done-surface', 'done-line', 'rest', 'bar', 'toast',
        ]),
        success: { DEFAULT: token('success'), soft: token('success-soft'), ink: token('success-ink') },
        warning: { DEFAULT: token('warning'), soft: token('warning-soft'), ink: token('warning-ink') },
        error: { DEFAULT: token('error'), soft: token('error-soft'), ink: token('error-ink'), line: token('error-line') },
        heat: { 0: token('heat-0'), 1: token('heat-1'), 2: token('heat-2'), 3: token('heat-3'), 4: token('heat-4') },
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
        lift: '0 1px 2px rgba(42, 26, 15, 0.18)',
        dialog: '0 24px 64px rgba(12, 8, 5, 0.40)',
        toast: '0 16px 40px rgba(12, 8, 5, 0.32), 0 0 0 1px rgba(232, 182, 122, 0.14)',
        pop: '0 16px 40px rgba(12, 8, 5, 0.22)',
        knob: '0 1px 3px rgba(42, 26, 15, 0.3)',
        fab: '0 8px 20px rgba(160, 82, 29, 0.35)',
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
