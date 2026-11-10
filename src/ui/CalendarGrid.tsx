import { Fragment, type ReactNode } from 'react';
import { weekdayLabels } from '@/domain/date';
import type { LocalDate, WeekStart } from '@/domain/types';
import { cx } from './cx';

/**
 * The one calendar layout in the app: weekday header + rows of seven days.
 * Date pickers, habit calendars, progress calendars and week strips all render through it.
 */
interface CalendarGridProps {
  rows: LocalDate[][];
  weekStart: WeekStart;
  renderDay: (date: LocalDate) => ReactNode;
  labels?: 'short' | 'narrow' | false;
  gap?: 'tight' | 'normal';
  className?: string;
}

export function CalendarGrid({ rows, weekStart, renderDay, labels = 'short', gap = 'normal', className }: CalendarGridProps) {
  const gapClass = gap === 'tight' ? 'gap-0.5' : 'gap-1.5';
  return (
    <div className={cx('flex flex-col', gapClass, className)}>
      {labels && (
        <div className={cx('grid grid-cols-7 text-center text-xs font-semibold text-muted', gapClass)} aria-hidden="true">
          {weekdayLabels(weekStart, labels).map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
      <div className={cx('grid grid-cols-7', gapClass)}>
        {rows.flat().map((d) => (
          <Fragment key={d}>{renderDay(d)}</Fragment>
        ))}
      </div>
    </div>
  );
}
