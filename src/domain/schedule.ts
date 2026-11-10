import { weekday } from './date';
import type { Habit, LocalDate, Schedule, ScheduleVersion } from './types';

export function isArchived(habit: Habit): boolean {
  return habit.pauses.some((p) => p.to === null);
}

export function isPaused(habit: Habit, date: LocalDate): boolean {
  return habit.pauses.some((p) => date >= p.from && (p.to === null || date <= p.to));
}

/** The schedule version that applies on `date`, or null when the habit isn't active then. */
export function versionOn(habit: Habit, date: LocalDate): ScheduleVersion | null {
  if (date < habit.startDate || isPaused(habit, date)) return null;
  let current: ScheduleVersion | null = null;
  for (const v of habit.schedules) {
    if (v.effectiveFrom <= date && (!current || v.effectiveFrom > current.effectiveFrom)) current = v;
  }
  return current ?? earliestVersion(habit);
}

export function currentSchedule(habit: Habit): ScheduleVersion {
  const latest = [...habit.schedules].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  if (!latest) throw new Error(`Habit ${habit.id} has no schedule`);
  return latest;
}

function earliestVersion(habit: Habit): ScheduleVersion | null {
  return [...habit.schedules].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0] ?? null;
}

/** True when a day-based schedule asks for the habit on this date. Weekly schedules never do. */
export function isScheduledOn(schedule: Schedule, date: LocalDate): boolean {
  if (schedule.type === 'daily') return true;
  if (schedule.type === 'days') return (schedule.days ?? []).includes(weekday(date));
  return false;
}

export function isWeekly(schedule: Schedule): boolean {
  return schedule.type === 'times';
}

export function sameSchedule(a: Schedule, b: Schedule): boolean {
  const days = (s: Schedule) => [...(s.days ?? [])].sort().join(',');
  return (
    a.type === b.type &&
    days(a) === days(b) &&
    (a.timesPerWeek ?? null) === (b.timesPerWeek ?? null) &&
    a.restDaysPerWeek === b.restDaysPerWeek
  );
}
