import type { LocalDate, WeekStart, Weekday } from './types';

const DAY_MS = 86_400_000;

export function toUtcMs(date: LocalDate): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

export function fromUtcMs(ms: number): LocalDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function makeDate(year: number, monthIndex: number, day: number): LocalDate {
  return fromUtcMs(Date.UTC(year, monthIndex, day));
}

export function isLocalDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && fromUtcMs(toUtcMs(value)) === value;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

export const minDate = (a: LocalDate, b: LocalDate): LocalDate => (a < b ? a : b);
export const maxDate = (a: LocalDate, b: LocalDate): LocalDate => (a > b ? a : b);

/** 0 = Monday … 6 = Sunday. */
export function weekday(date: LocalDate): Weekday {
  return ((new Date(toUtcMs(date)).getUTCDay() + 6) % 7) as Weekday;
}

/** Index of `date` inside its week (0 = first day of the user's week). */
export function weekPosition(date: LocalDate, weekStart: WeekStart): number {
  const wd = weekday(date);
  return weekStart === 'monday' ? wd : (wd + 1) % 7;
}

export function startOfWeek(date: LocalDate, weekStart: WeekStart): LocalDate {
  return addDays(date, -weekPosition(date, weekStart));
}

export function endOfWeek(date: LocalDate, weekStart: WeekStart): LocalDate {
  return addDays(startOfWeek(date, weekStart), 6);
}

export function startOfMonth(date: LocalDate): LocalDate {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: LocalDate): LocalDate {
  const d = new Date(toUtcMs(date));
  return makeDate(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
}

export function addMonths(date: LocalDate, months: number): LocalDate {
  const d = new Date(toUtcMs(startOfMonth(date)));
  return makeDate(d.getUTCFullYear(), d.getUTCMonth() + months, 1);
}

/** Inclusive list of dates. Empty when `from > to`. */
export function eachDay(from: LocalDate, to: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Rows of 7 dates covering `from`…`to`, padded to whole weeks. */
export function weekRows(from: LocalDate, to: LocalDate, weekStart: WeekStart): LocalDate[][] {
  const rows: LocalDate[][] = [];
  const last = endOfWeek(to, weekStart);
  for (let s = startOfWeek(from, weekStart); s <= last; s = addDays(s, 7)) {
    rows.push(eachDay(s, addDays(s, 6)));
  }
  return rows;
}

/** Today's date in an IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): LocalDate {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function detectTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/** Formats a LocalDate for display. Always formats in UTC so the date never shifts. */
export function formatDate(date: LocalDate, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(new Date(toUtcMs(date)));
}

export const formatShort = (d: LocalDate) => formatDate(d, { day: 'numeric', month: 'short' });
export const formatLong = (d: LocalDate) => formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' });
export const formatWeekday = (d: LocalDate) => formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' });

export function weekdayLabels(weekStart: WeekStart, style: 'narrow' | 'short' = 'short'): string[] {
  const monday = '2024-01-01';
  const first = weekStart === 'monday' ? monday : addDays(monday, -1);
  return eachDay(first, addDays(first, 6)).map((d) => formatDate(d, { weekday: style }));
}

export function formatRange(from: LocalDate, to: LocalDate): string {
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${sameYear ? formatShort(from) : formatLong(from)} – ${formatLong(to)}`;
}
