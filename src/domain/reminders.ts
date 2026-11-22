import { isArchived, isWeekly, versionOn } from './schedule';
import { LedgerStats } from './stats';
import type { Checkin, Habit, LocalDate, Task, WeekStart } from './types';

/**
 * Which habit and task reminders are due right now (used by the scheduled reminder job).
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

/** True from the reminder time until REMINDER_WINDOW_MINUTES after it. */
const inWindow = (time: string, now: string) => {
  const since = minutes(now) - minutes(time);
  return since >= 0 && since <= REMINDER_WINDOW_MINUTES;
};

export function dueReminders(input: ReminderInput): Habit[] {
  const stats = new LedgerStats(input);
  return input.habits.filter((habit) => {
    if (!habit.reminder || isArchived(habit) || input.sent[habit.id] === input.today) return false;
    if (!inWindow(habit.reminder, input.now)) return false;
    const version = versionOn(habit, input.today);
    if (!version) return false;
    if (isWeekly(version)) {
      const week = stats.weekProgress(habit, input.today);
      return !!week && week.done < week.target && !stats.isDone(habit.id, input.today);
    }
    return stats.dayStatus(habit, input.today) === 'pending';
  });
}

export interface TaskReminderInput {
  tasks: Task[];
  today: LocalDate;
  now: string;
  /** Task id → taskReminderKey of the reminder last sent. */
  sent: Record<string, string>;
}

/** What a sent task reminder is recorded as, so moving the task to a new date or time reminds again. */
export const taskReminderKey = (task: Task): string => `${task.date} ${task.time}`;

/** Open tasks whose date is today and whose time has come. */
export function dueTaskReminders({ tasks, today, now, sent }: TaskReminderInput): Task[] {
  return tasks.filter(
    (task) => !task.doneOn && task.date === today && !!task.time && inWindow(task.time, now) && sent[task.id] !== taskReminderKey(task),
  );
}

const list = (names: string[]) => names.join(', ');

export function reminderMessage(habits: Habit[], tasks: Task[] = []): { title: string; body: string } {
  const parts: string[] = [];
  if (habits.length === 1) parts.push(`Time for ${habits[0]!.name}.`);
  if (habits.length > 1) parts.push(`${habits.length} habits are waiting: ${list(habits.map((h) => h.name))}.`);
  if (tasks.length === 1) parts.push(`To do: ${tasks[0]!.title}.`);
  if (tasks.length > 1) parts.push(`${tasks.length} tasks are due: ${list(tasks.map((t) => t.title))}.`);
  return { title: 'Ledger', body: parts.join(' ') };
}
