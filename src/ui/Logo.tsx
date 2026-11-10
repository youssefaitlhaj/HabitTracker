import { APP_NAME } from '@/app/config';
import { cx } from './cx';

/** The Ledger mark (docs/brand/ledger-mark*.svg), drawn inline so it can switch tone. */

const TONES = {
  light: { arch: '#A0521D', book: '#3A2416', bud: '#7A3E14' },
  dark: { arch: '#E8B67A', book: '#F4EEE2', bud: '#D9A066' },
} as const;

interface LogoProps {
  size?: number;
  tone?: keyof typeof TONES;
  decorative?: boolean;
}

export function LogoMark({ size = 40, tone = 'light', decorative = true }: LogoProps) {
  const c = TONES[tone];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `${APP_NAME} logo`}
    >
      <g fill="none" stroke={c.arch} strokeWidth="3.2" strokeLinecap="round">
        <path d="M5 40 A27 27 0 0 1 59 40" />
        <path d="M11 40 A21 21 0 0 1 53 40" />
        <path d="M17 40 A15 15 0 0 1 47 40" />
      </g>
      <g fill="none" stroke={c.book} strokeWidth="3" strokeLinecap="round">
        <path d="M29.5 46.5 C22 42.8 14.5 42 8 43" />
        <path d="M30 50.5 C22 46.6 13.5 45.8 6 47.2" />
        <path d="M31 54.8 C23 50.8 13 50 4.5 51.6" />
        <path d="M34.5 46.5 C42 42.8 49.5 42 56 43" />
        <path d="M34 50.5 C42 46.6 50.5 45.8 58 47.2" />
        <path d="M33 54.8 C41 50.8 51 50 59.5 51.6" />
      </g>
      <path d="M32 46.5 C26.8 43.5 25.6 38.8 26.2 35.2 C28.9 36 31 37.8 32 40.2 C33 37.8 35.1 36 37.8 35.2 C38.4 38.8 37.2 43.5 32 46.5 Z" fill={c.bud} />
      <circle cx="32" cy="30.8" r="2.7" fill={c.arch} />
    </svg>
  );
}

export function Wordmark({ tone = 'light', size = 40, className }: Omit<LogoProps, 'decorative'> & { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} tone={tone} />
      <span className={cx('font-display text-2xl font-semibold tracking-tight', tone === 'dark' ? 'text-paper' : 'text-ink')}>
        {APP_NAME}
      </span>
    </span>
  );
}
