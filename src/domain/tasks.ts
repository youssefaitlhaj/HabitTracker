import { addDays, eachDay, startOfWeek } from './date';
import { SEVERITIES, type LocalDate, type Severity, type Task, type TaskDraft, type WeekStart } from './types';

/**
 * Tasks: one-off to-dos with optional notes, date, time and severity.
 * Dated tasks show on Today from their date until done (overdue after it); undated tasks live in
 * the Tasks section. Tasks never affect habit streaks or progress.
 */

export const TASK_TITLE_MAX = 120;
export const TASK_NOTES_MAX = 2000;
export const TASK_STATS_WEEKS = 8;
const ON_TIME_WINDOW_DAYS = 30;

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export interface TaskDraftErrors {
  title?: string;
  time?: string;
}

export function emptyTaskDraft(date: LocalDate | null = null): TaskDraft {
  return { title: '', notes: '', date, time: null, severity: null };
}

export const draftFromTask = ({ title, notes, date, time, severity }: Task): TaskDraft => ({ title, notes, date, time, severity });

export function validateTaskDraft(draft: TaskDraft): TaskDraftErrors {
  return {
    title: draft.title.trim() ? undefined : 'Give the task a name.',
    time: draft.time && !draft.date ? 'Pick a date to set a time.' : undefined,
  };
}

function clean(draft: TaskDraft): TaskDraft {
  return {
    title: draft.title.trim().slice(0, TASK_TITLE_MAX),
    notes: draft.notes.trim().slice(0, TASK_NOTES_MAX),
    date: draft.date,
    time: draft.date ? draft.time : null,
    severity: draft.severity,
  };
}

export function createTask(draft: TaskDraft, id: string, now: string): Task {
  return { id, ...clean(draft), doneOn: null, createdAt: now, updatedAt: now };
}

export function applyTaskEdit(task: Task, draft: TaskDraft, now: string): Task {
  return { ...task, ...clean(draft), updatedAt: now };
}

export function setTaskDone(task: Task, done: boolean, today: LocalDate, now: string): Task {
  return { ...task, doneOn: done ? today : null, updatedAt: now };
}

/** Fills fields missing in tasks saved before notes, time and severity existed. */
export function normaliseTask(raw: Partial<Task> & Pick<Task, 'id' | 'title' | 'createdAt'>): Task {
  return {
    id: raw.id,
    title: raw.title,
    notes: raw.notes ?? '',
    date: raw.date ?? null,
    time: raw.date ? raw.time ?? null : null,
    severity: raw.severity && (SEVERITIES as readonly string[]).includes(raw.severity) ? raw.severity : null,
    doneOn: raw.doneOn ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? raw.createdAt,
  };
}

export const isOverdue = (task: Task, today: LocalDate): boolean => !task.doneOn && !!task.date && task.date < today;

/** Earliest date first, timed before untimed, then more severe first, then oldest. */
export function compareTasks(a: Task, b: Task): number {
  return (
    (a.date ?? '9999').localeCompare(b.date ?? '9999') ||
    (a.time ?? '99:99').localeCompare(b.time ?? '99:99') ||
    (a.severity ? SEVERITY_RANK[a.severity] : 3) - (b.severity ? SEVERITY_RANK[b.severity] : 3) ||
    a.createdAt.localeCompare(b.createdAt)
  );
}

/** Today's To-do column: overdue and today's open tasks, plus the ones finished today. */
export function tasksForToday(tasks: Task[], today: LocalDate): { overdue: Task[]; today: Task[]; done: Task[] } {
  const open = tasks.filter((t) => !t.doneOn && t.date && t.date <= today).sort(compareTasks);
  return {
    overdue: open.filter((t) => t.date! < today),
    today: open.filter((t) => t.date === today),
    done: tasks.filter((t) => t.doneOn === today).sort(compareTasks),
  };
}

export const TASK_FILTERS = ['all', 'today', 'upcoming', 'overdue', 'undated', 'done'] as const;
export type TaskFilter = (typeof TASK_FILTERS)[number];

export interface TaskGroup {
  key: 'overdue' | 'today' | 'upcoming' | 'undated' | 'done';
  tasks: Task[];
}

/** The Tasks section list: filtered, searched and grouped. Empty groups are left out. */
export function groupTasks(tasks: Task[], today: LocalDate, filter: TaskFilter, query = ''): TaskGroup[] {
  const q = query.trim().toLowerCase();
  const matching = tasks.filter((t) => !q || t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q));
  const open = matching.filter((t) => !t.doneOn).sort(compareTasks);
  const groups: TaskGroup[] = [
    { key: 'overdue', tasks: open.filter((t) => t.date && t.date < today) },
    { key: 'today', tasks: open.filter((t) => t.date === today) },
    { key: 'upcoming', tasks: open.filter((t) => t.date && t.date > today) },
    { key: 'undated', tasks: open.filter((t) => !t.date) },
    { key: 'done', tasks: matching.filter((t) => t.doneOn).sort((a, b) => b.doneOn!.localeCompare(a.doneOn!) || compareTasks(a, b)) },
  ];
  const wanted = filter === 'all' ? groups : groups.filter((g) => g.key === filter);
  return wanted.filter((g) => g.tasks.length > 0);
}

export interface TaskStats {
  open: number;
  overdue: number;
  undated: number;
  doneThisWeek: number;
  doneLastWeek: number;
  /** Share of dated tasks finished on or before their date, in the last 30 days; null if none. */
  onTimeRate: number | null;
  /** Tasks finished per week, oldest first, ending with the current week. */
  perWeek: { weekStart: LocalDate; count: number }[];
  openBySeverity: Record<Severity | 'none', number>;
}

export function taskStats(tasks: Task[], today: LocalDate, weekStart: WeekStart): TaskStats {
  const open = tasks.filter((t) => !t.doneOn);
  const thisWeek = startOfWeek(today, weekStart);
  const perWeek = Array.from({ length: TASK_STATS_WEEKS }, (_, i) => addDays(thisWeek, (i - TASK_STATS_WEEKS + 1) * 7)).map((w) => ({
    weekStart: w,
    count: tasks.filter((t) => t.doneOn && t.doneOn >= w && t.doneOn <= addDays(w, 6)).length,
  }));
  const recentWindow = eachDay(addDays(today, 1 - ON_TIME_WINDOW_DAYS), today)[0]!;
  const recentDated = tasks.filter((t) => t.doneOn && t.doneOn >= recentWindow && t.date);
  const openBySeverity: TaskStats['openBySeverity'] = { high: 0, medium: 0, low: 0, none: 0 };
  open.forEach((t) => (openBySeverity[t.severity ?? 'none'] += 1));
  return {
    open: open.length,
    overdue: open.filter((t) => isOverdue(t, today)).length,
    undated: open.filter((t) => !t.date).length,
    doneThisWeek: perWeek[perWeek.length - 1]!.count,
    doneLastWeek: perWeek[perWeek.length - 2]!.count,
    onTimeRate: recentDated.length ? recentDated.filter((t) => t.doneOn! <= t.date!).length / recentDated.length : null,
    perWeek,
    openBySeverity,
  };
}
