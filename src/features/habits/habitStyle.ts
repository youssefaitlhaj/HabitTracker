import { formatDate } from '@/domain/date';
import type { Category, HabitColor, Schedule, Weekday } from '@/domain/types';

/** Display helpers for habits, used by every screen that shows one. */

export const HABIT_COLOR_HEX: Record<HabitColor, string> = {
  whisky: '#A0521D',
  oak: '#6B3410',
  amber: '#C9813A',
  sage: '#6E7B4F',
  clay: '#A8584A',
  slate: '#5C6670',
};

export const COLOR_LABEL: Record<HabitColor, string> = {
  whisky: 'Whisky',
  oak: 'Oak',
  amber: 'Amber',
  sage: 'Sage',
  clay: 'Clay',
  slate: 'Slate',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  health: 'Health',
  mind: 'Mind',
  learning: 'Learning',
  home: 'Home',
  social: 'Social',
};

const dayName = (d: Weekday) => formatDate(`2024-01-0${d + 1}`, { weekday: 'short' });

function describeDays(days: Weekday[]): string {
  const sorted = [...days].sort();
  if (sorted.length === 7) return 'Every day';
  if (sorted.join() === '0,1,2,3,4') return 'Mon – Fri';
  if (sorted.join() === '5,6') return 'Weekends';
  return sorted.map(dayName).join(', ');
}

export function describeSchedule(schedule: Schedule): string {
  if (schedule.type === 'daily') return 'Every day';
  if (schedule.type === 'times') return `${schedule.timesPerWeek} ${schedule.timesPerWeek === 1 ? 'time' : 'times'} a week`;
  return describeDays(schedule.days ?? []);
}

export function describeRest(schedule: Schedule): string | null {
  if (schedule.type === 'times' || schedule.restDaysPerWeek === 0) return null;
  return `${schedule.restDaysPerWeek} rest ${schedule.restDaysPerWeek === 1 ? 'day' : 'days'} a week`;
}

export function streakLabel(value: number, unit: 'days' | 'weeks'): string {
  if (value === 0) return 'Start a streak today';
  const word = unit === 'days' ? 'day' : 'week';
  return `${value} ${word} streak`;
}

export const WEEKDAYS: { value: Weekday; short: string; full: string }[] = ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => ({
  value: d,
  short: dayName(d).charAt(0),
  full: formatDate(`2024-01-0${d + 1}`, { weekday: 'long' }),
}));
