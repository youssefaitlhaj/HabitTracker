import type { Checkin, Habit, LocalDate, Schedule } from '@/domain/types';
import { eachDay } from '@/domain/date';

let seq = 0;

export const DAILY: Schedule = { type: 'daily', days: null, timesPerWeek: null, restDaysPerWeek: 0 };

export function makeHabit(overrides: Partial<Habit> & { schedule?: Partial<Schedule> } = {}): Habit {
  const { schedule, ...rest } = overrides;
  const startDate = rest.startDate ?? '2026-11-02';
  seq += 1;
  return {
    id: `h${seq}`,
    name: `Habit ${seq}`,
    category: 'health',
    color: 'whisky',
    reminder: null,
    startDate,
    why: '',
    order: seq,
    schedules: [{ ...DAILY, ...schedule, effectiveFrom: startDate }],
    pauses: [],
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    ...rest,
  };
}

export function checkinsFor(habit: Habit, dates: LocalDate[]): Checkin[] {
  return dates.map((date) => ({ habitId: habit.id, date }));
}

export function checkinsBetween(habit: Habit, from: LocalDate, to: LocalDate, except: LocalDate[] = []): Checkin[] {
  return checkinsFor(habit, eachDay(from, to).filter((d) => !except.includes(d)));
}
