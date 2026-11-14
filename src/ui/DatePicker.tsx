import { useEffect, useRef, useState } from 'react';
import { addMonths, endOfMonth, formatDate, formatLong, startOfMonth, weekRows } from '@/domain/date';
import type { LocalDate, WeekStart } from '@/domain/types';
import { CalendarGrid } from './CalendarGrid';
import { cx } from './cx';
import { fieldClass } from './Field';
import { Icon } from './Icon';

interface DatePickerProps {
  id?: string;
  /** Null shows "No date" (only meaningful together with onClear). */
  value: LocalDate | null;
  onChange: (date: LocalDate) => void;
  /** Makes the date optional: adds a Clear button. */
  onClear?: () => void;
  today: LocalDate;
  weekStart: WeekStart;
  min?: LocalDate;
  max?: LocalDate;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Styled date picker (no browser default popup), built on CalendarGrid.
 * The calendar opens inline below the field so scrolling sheets and dialogs never clip it.
 */
export function DatePicker({ id, value, onChange, onClear, today, weekStart, min, max, invalid, describedBy }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(startOfMonth(value ?? today));
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !root.current?.contains(e.target as Node)) {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close, true);
    };
  }, [open]);

  const allowed = (d: LocalDate) => (!min || d >= min) && (!max || d <= max);
  const pick = (d: LocalDate) => {
    onChange(d);
    setOpen(false);
  };
  const monthEnd = endOfMonth(month);

  return (
    <div ref={root} className="flex flex-col gap-1.5">
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        onClick={() => {
          setMonth(startOfMonth(value ?? today));
          setOpen(!open);
        }}
        className={fieldClass(invalid, cx('flex h-12 items-center justify-between gap-2 text-left', open && 'border-whisky'))}
      >
        {value ? (
          <span>
            {formatDate(value, { weekday: 'short' })}, {formatLong(value)}
            {value === today && <span className="text-muted"> (today)</span>}
          </span>
        ) : (
          <span className="text-muted">No date</span>
        )}
        <Icon name="calendar" className="text-whisky" />
      </button>
      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-label="Choose a date"
          className="flex w-full max-w-[320px] animate-pop-in flex-col gap-2.5 rounded-[18px] border border-line bg-surface p-3.5 shadow-pop"
        >
          <div className="flex items-center justify-between">
            <MonthButton dir={-1} onClick={() => setMonth(addMonths(month, -1))} disabled={!!min && month <= min} />
            <span className="font-display text-base font-semibold" aria-live="polite">
              {formatDate(month, { month: 'long', year: 'numeric' })}
            </span>
            <MonthButton dir={1} onClick={() => setMonth(addMonths(month, 1))} disabled={!!max && monthEnd >= max} />
          </div>
          <CalendarGrid
            rows={weekRows(month, monthEnd, weekStart)}
            weekStart={weekStart}
            labels="narrow"
            gap="tight"
            renderDay={(d) => {
              const inMonth = d >= month && d <= monthEnd;
              const selected = d === value;
              return (
                <button
                  type="button"
                  disabled={!inMonth || !allowed(d)}
                  onClick={() => pick(d)}
                  aria-pressed={selected}
                  aria-label={formatLong(d) + (d === today ? ', today' : '')}
                  className={cx(
                    'h-[38px] rounded-[10px] border-[1.5px] text-sm disabled:cursor-not-allowed',
                    !inMonth && 'invisible',
                    inMonth && !allowed(d) && 'opacity-35',
                    selected ? 'border-whisky bg-whisky font-bold text-on-accent' : 'border-transparent hover:bg-oat',
                    d === today && !selected && 'border-whisky font-bold',
                  )}
                >
                  {Number(d.slice(8))}
                </button>
              );
            }}
          />
          <div className="flex justify-between border-t border-line-soft pt-2">
            <button type="button" disabled={!allowed(today)} onClick={() => pick(today)} className="min-h-9 px-2.5 font-semibold text-whisky disabled:opacity-40">
              Today
            </button>
            {onClear && value ? (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className="min-h-9 px-2.5 font-semibold text-muted"
              >
                Clear date
              </button>
            ) : (
              <button type="button" onClick={() => setOpen(false)} className="min-h-9 px-2.5 font-semibold text-muted">
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MonthButton({ dir, onClick, disabled }: { dir: -1 | 1; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir < 0 ? 'Previous month' : 'Next month'}
      className="flex h-10 w-10 items-center justify-center rounded-[10px] hover:bg-oat disabled:opacity-30"
    >
      <Icon name={dir < 0 ? 'chevronLeft' : 'chevronRight'} size={16} strokeWidth={2.5} />
    </button>
  );
}
