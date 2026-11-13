import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

/** Selection controls: switch, segmented control, chips and stepper. */

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'flex h-8 w-[52px] shrink-0 items-center rounded-full p-[3px] transition-colors disabled:opacity-45',
        checked ? 'justify-end bg-whisky' : 'justify-start bg-line-strong',
      )}
    >
      <span className="h-[26px] w-[26px] rounded-full bg-on-cask shadow-knob" />
    </button>
  );
}

export interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  stretch?: boolean;
  className?: string;
}

export function Segmented<T extends string>({ options, value, onChange, label, stretch, className }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className={cx('flex gap-1 rounded-field bg-oat p-1', stretch ? 'w-full' : 'flex-wrap self-start', className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cx(
              'min-h-10 rounded-[9px] text-sm font-semibold transition-colors',
              stretch ? 'flex-1 px-2' : 'px-4',
              on ? 'bg-surface text-oak shadow-lift' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: 'light' | 'dark';
  label?: string;
}

export function Chip({ selected, onClick, children, tone = 'dark', label }: ChipProps) {
  // Selected chips invert the page colours, so they stand out in light and dark themes alike.
  const on = tone === 'dark' ? 'border-ink bg-ink text-paper' : 'border-whisky bg-whisky text-on-accent';
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      className={cx(
        'inline-flex min-h-10 items-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-medium transition-colors',
        selected ? on : 'border-line bg-field text-ink hover:border-line-strong',
      )}
    >
      {children}
    </button>
  );
}

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  onLimit?: (edge: 'min' | 'max') => void;
}

export function Stepper({ value, min, max, onChange, label, onLimit }: StepperProps) {
  const step = (delta: -1 | 1) => {
    const next = value + delta;
    if (next < min || next > max) onLimit?.(next < min ? 'min' : 'max');
    else onChange(next);
  };
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <StepButton label={`Fewer: ${label}`} onClick={() => step(-1)} sign="−" />
      <span className="min-w-6 text-center font-display text-2xl font-semibold" aria-live="polite">
        {value}
      </span>
      <StepButton label={`More: ${label}`} onClick={() => step(1)} sign="+" />
    </div>
  );
}

function StepButton({ label, onClick, sign }: { label: string; onClick: () => void; sign: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="h-11 w-11 rounded-field border-[1.5px] border-line-strong bg-field text-xl text-ink hover:bg-surface"
    >
      {sign}
    </button>
  );
}

export function CheckMark({ on, size = 16 }: { on: boolean; size?: number }) {
  return (
    <span className={cx('transition-opacity', on ? 'opacity-100' : 'opacity-0')}>
      <Icon name="check" size={size} strokeWidth={3} />
    </span>
  );
}
