import { addMonths, endOfMonth, formatDate, formatLong, maxDate, minDate, startOfMonth, weekdayLabels, weekRows } from '@/domain/date';
import type { LedgerStats } from '@/domain/stats';
import { levelForRatio } from '@/domain/stats';
import type { LocalDate, WeekStart } from '@/domain/types';
import { CalendarGrid } from '@/ui/CalendarGrid';
import { cx } from '@/ui/cx';
import { HEAT_BG, heatText } from '@/ui/heat';
import { CALENDAR_MAX_DAYS, rangeDays, type ResolvedRange } from './range';

/** Chart for any range: a calendar up to six weeks, a week-column grid (or month tiles on phones) beyond. */

interface ChartProps {
  range: ResolvedRange;
  stats: LedgerStats;
  weekStart: WeekStart;
}

function dayInfo(stats: LedgerStats, range: ResolvedRange, d: LocalDate) {
  const inRange = d >= range.from && d <= range.until;
  const s = stats.daySummary(d);
  const known = inRange && !s.future && d >= stats.earliestDate();
  const description = !inRange
    ? ''
    : s.future
      ? `${formatLong(d)}: upcoming`
      : s.skipped
        ? `${formatLong(d)}: nothing scheduled`
        : `${formatLong(d)}: ${s.done} of ${s.scheduled} habits`;
  return { inRange, known, summary: s, description };
}

function cellTone(info: ReturnType<typeof dayInfo>): string {
  if (!info.known) return info.inRange ? 'border border-dashed border-line-strong bg-transparent' : 'bg-transparent';
  if (info.summary.skipped) return 'bg-oat';
  return HEAT_BG[info.summary.level];
}

export function RangeChart({ range, stats, weekStart }: ChartProps) {
  if (rangeDays(range) <= CALENDAR_MAX_DAYS) {
    return (
      <CalendarGrid
        rows={weekRows(range.from, range.until, weekStart)}
        weekStart={weekStart}
        renderDay={(d) => {
          const info = dayInfo(stats, range, d);
          const level = info.known && !info.summary.skipped ? info.summary.level : 0;
          return (
            <div
              title={info.description}
              aria-label={info.description || undefined}
              className={cx(
                'flex h-12 flex-col justify-between rounded-[10px] px-2 py-1.5 tablet:h-16 tablet:px-2.5',
                cellTone(info),
                heatText(level),
                !info.inRange && 'opacity-30',
              )}
            >
              <span className="text-[13px] font-semibold">{Number(d.slice(8))}</span>
              {info.known && !info.summary.skipped && (
                <span className="hidden text-xs tablet:block">
                  {info.summary.done}/{info.summary.scheduled}
                </span>
              )}
            </div>
          );
        }}
      />
    );
  }
  return (
    <>
      <div className="hidden tablet:block">
        <WeekColumns range={range} stats={stats} weekStart={weekStart} />
      </div>
      <div className="tablet:hidden">
        <MonthTiles range={range} stats={stats} />
      </div>
    </>
  );
}

function WeekColumns({ range, stats, weekStart }: ChartProps) {
  const weeks = weekRows(range.from, range.until, weekStart);
  const cell = weeks.length > 40 ? 13 : weeks.length > 24 ? 18 : 24;
  const gap = weeks.length > 40 ? 3 : 4;
  let lastLabel = -3;
  const labels = weeks.map((week, i) => {
    const first = week.find((d) => d.endsWith('-01') && d >= range.from && d <= range.until) ?? (i === 0 ? range.from : null);
    if (!first || i - lastLabel < 3) return '';
    lastLabel = i;
    return formatDate(first, { month: 'short' });
  });
  const dayLabels = weekdayLabels(weekStart);

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex w-max flex-col gap-2">
        <div className="ml-10 flex text-xs text-muted" style={{ gap }} aria-hidden="true">
          {labels.map((l, i) => (
            <span key={i} className="shrink-0 whitespace-nowrap" style={{ width: cell }}>
              {l}
            </span>
          ))}
        </div>
        <div className="flex" style={{ gap }} role="img" aria-label={`Habits completed per day, ${range.label}`}>
          <div className="flex w-[37px] flex-col text-[11px] text-muted" style={{ gap }} aria-hidden="true">
            {dayLabels.map((l, i) => (
              <span key={i} style={{ height: cell, lineHeight: `${cell}px` }}>
                {i % 2 === 0 ? l : ''}
              </span>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week[0]} className="flex flex-col" style={{ gap }}>
              {week.map((d) => {
                const info = dayInfo(stats, range, d);
                return (
                  <span
                    key={d}
                    title={info.description}
                    className={cx('rounded-[3px]', cellTone(info))}
                    style={{ width: cell, height: cell }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthTiles({ range, stats }: Omit<ChartProps, 'weekStart'>) {
  const months: LocalDate[] = [];
  for (let m = startOfMonth(range.from); m <= range.until; m = addMonths(m, 1)) months.push(m);
  return (
    <div className="grid grid-cols-3 gap-2">
      {months.map((m) => {
        const r = stats.rangeStats(maxDate(m, range.from), minDate(endOfMonth(m), range.until));
        const level = r.completion === null ? 0 : levelForRatio(r.completion);
        return (
          <div key={m} className={cx('flex min-h-16 flex-col gap-1 rounded-[14px] p-3', HEAT_BG[level], heatText(level))}>
            <span className="text-xs font-semibold">{formatDate(m, { month: 'short', year: '2-digit' })}</span>
            <span className="font-display text-xl font-semibold">{r.completion === null ? '–' : `${Math.round(r.completion * 100)}%`}</span>
          </div>
        );
      })}
    </div>
  );
}
