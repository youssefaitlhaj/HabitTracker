import { isArchived, isWeekly, versionOn } from './schedule';
import { LedgerStats } from './stats';
import type { Checkin, Habit, LocalDate, WeekStart } from './types';

/**
 * Which habit reminders are due right now (used by the scheduled reminder job).
 * It reuses LedgerStats, so "not done yet" means exactly what Today shows.
 */

/** Reminders older than this aren't sent, e.g. when the scheduler was down for hours. */
export const REMINDER_WINDOW_MINUTES = 180;

export interface ReminderInput {
  habits: Habit[];
  checkins: Checkin[];
  weekStart: WeekStart;
  today: LocalDate;
  accountCreated: LocalDate;
  /** Current time of day in the user's time zone, `HH:MM`. */
  now: string;
  /** Habit id → date its reminder was last sent. */
  sent: Record<string, LocalDate>;
}

const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number) as [number, number];
  return h * 60 + m;
};

export function dueReminders(input: ReminderInput): Habit[] {
  const stats = new LedgerStats(input);
  const now = minutes(input.now);
  return input.habits.filter((habit) => {
    if (!habit.reminder || isArchived(habit) || input.sent[habit.id] === input.today) return false;
    const since = now - minutes(habit.reminder);
    if (since < 0 || since > REMINDER_WINDOW_MINUTES) return false;
    const version = versionOn(habit, input.today);
    if (!version) return false;
    if (isWeekly(version)) {
      const week = stats.weekProgress(habit, input.today);
      return !!week && week.done < week.target && !stats.isDone(habit.id, input.today);
    }
    return stats.dayStatus(habit, input.today) === 'pending';
  });
}

export function reminderMessage(habits: Habit[]): { title: string; body: string } {
  const names = habits.map((h) => h.name);
  return {
    title: 'Ledger',
    body: names.length === 1 ? `Time for ${names[0]}.` : `${names.length} habits are waiting: ${names.join(', ')}.`,
  };
}
