import type { LocalDate, Task } from './types';

/**
 * Daily tasks: one-off to-dos. A task belongs to the day it was added for; while it isn't done
 * it keeps showing on Today (carried over). Tasks never affect habit streaks or progress.
 */

export const TASK_TITLE_MAX = 120;

export function createTask(title: string, today: LocalDate, id: string, now: string): Task {
  return { id, title: title.trim().slice(0, TASK_TITLE_MAX), date: today, doneOn: null, createdAt: now, updatedAt: now };
}

export function setTaskDone(task: Task, done: boolean, today: LocalDate, now: string): Task {
  return { ...task, doneOn: done ? today : null, updatedAt: now };
}

export const isCarriedOver = (task: Task, today: LocalDate): boolean => task.date < today;

const byAge = (a: Task, b: Task) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);

/** What Today shows: open tasks (carried-over first, oldest first) and the ones finished today. */
export function tasksForToday(tasks: Task[], today: LocalDate): { open: Task[]; done: Task[] } {
  return {
    open: tasks.filter((t) => !t.doneOn && t.date <= today).sort(byAge),
    done: tasks.filter((t) => t.doneOn === today).sort(byAge),
  };
}
