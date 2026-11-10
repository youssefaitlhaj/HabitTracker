import type { ReactNode } from 'react';
import { cx } from './cx';
import { HEAT_BG, HEAT_LEVELS } from './heat';
import { Icon, type IconName } from './Icon';

/** Small presentational pieces shared across screens. */

const TILE_TONES = {
  light: 'border border-line bg-surface text-ink',
  well: 'bg-paper text-ink',
  dark: 'bg-cask text-paper',
} as const;

interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: keyof typeof TILE_TONES;
  accent?: boolean;
  className?: string;
}

export function StatTile({ label, value, unit, tone = 'light', accent, className }: StatTileProps) {
  const dark = tone === 'dark';
  return (
    <div className={cx('flex flex-col gap-1.5 rounded-[18px] p-4 tablet:p-5', TILE_TONES[tone], className)}>
      <span className={cx('text-[13px] font-semibold', dark ? 'text-[#D9C7AA]' : 'text-muted')}>{label}</span>
      <span className={cx('font-display text-[32px] font-semibold leading-none tablet:text-[36px]', accent && (dark ? 'text-amber' : 'text-whisky'))}>
        {value}
        {unit && <span className={cx('ml-1.5 text-base', dark ? 'text-amber' : 'text-muted')}>{unit}</span>}
      </span>
    </div>
  );
}

interface ProgressRingProps {
  ratio: number;
  size: number;
  stroke: number;
  track: string;
  color: string;
  children?: ReactNode;
  celebrate?: boolean;
}

export function ProgressRing({ ratio, size, stroke, track, color, children, celebrate }: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <div className={cx('relative shrink-0', celebrate && 'animate-glow')} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, ratio)))}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  max: number;
  highlight?: boolean;
  empty?: boolean;
}

export function Bars({ data, height = 110, dark = false }: { data: BarDatum[]; height?: number; dark?: boolean }) {
  return (
    <div className="flex items-end gap-2" style={{ height }} aria-hidden="true">
      {data.map((d) => (
        <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-xs font-semibold text-muted">{d.empty ? '' : d.value}</span>
          <div
            className={cx(
              'w-full max-w-7 rounded-t-md rounded-b-[3px]',
              d.empty ? 'border-[1.5px] border-dashed border-line-strong' : d.highlight ? 'bg-whisky' : dark ? 'bg-[#5A3E27]' : 'bg-[#D9C3A3]',
            )}
            style={{ height: d.empty ? height - 40 : Math.max(4, (d.value / Math.max(1, d.max)) * (height - 40)) }}
          />
          <span className={cx('text-xs', d.highlight ? 'font-bold text-ink' : 'font-medium text-muted')}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function HeatLegend() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted" aria-hidden="true">
      <span>Fewer</span>
      {HEAT_LEVELS.map((l) => (
        <span key={l} className={cx('h-3 w-3 rounded-[3px]', HEAT_BG[l])} />
      ))}
      <span>All done</span>
    </div>
  );
}

interface EmptyStateProps {
  icon: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-[18px] border-[1.5px] border-dashed border-line-strong px-5 py-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-oat-deep text-oak">
        <Icon name={icon} size={26} />
      </span>
      <span className="font-display text-lg font-semibold">{title}</span>
      {children && <span className="max-w-[260px] text-sm text-muted">{children}</span>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx('block animate-shimmer rounded-[14px] bg-[linear-gradient(90deg,#EFE7D8_0,#F8F3EA_50%,#EFE7D8_100%)] bg-[length:400px_100%]', className)}
    />
  );
}

export function LoadingScreen() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6" role="status" aria-label="Loading">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-40" />
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  );
}

export function Avatar({ url, name, size = 44, className }: { url: string | null; name: string; size?: number; className?: string }) {
  const initials = name.trim().split(/\s+/).map((w) => w.charAt(0)).join('').slice(0, 2).toUpperCase() || '?';
  return url ? (
    <img src={url} alt="" width={size} height={size} className={cx('shrink-0 rounded-[30%] object-cover', className)} />
  ) : (
    <span
      aria-hidden="true"
      className={cx('flex shrink-0 items-center justify-center rounded-[30%] bg-cask font-display font-semibold text-amber', className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        {eyebrow && <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">{eyebrow}</p>}
        <h1 className="m-0 font-display text-[clamp(32px,5vw,48px)] font-normal leading-[1.05] tracking-tight">{title}</h1>
      </div>
      {actions}
    </header>
  );
}

export function SectionTitle({ children, aside, id }: { children: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="m-0 font-display text-[22px] font-semibold tablet:text-2xl">
        {children}
      </h2>
      {aside && <span className="text-[13px] text-muted">{aside}</span>}
    </div>
  );
}
