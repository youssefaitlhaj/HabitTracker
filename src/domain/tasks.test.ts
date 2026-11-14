import { describe, expect, it } from 'vitest';
import {
  applyTaskEdit,
  createTask,
  emptyTaskDraft,
  groupTasks,
  normaliseTask,
  setTaskDone,
  taskStats,
  tasksForToday,
  validateTaskDraft,
} from './tasks';
import type { Task } from './types';

const TODAY = '2026-11-14'; // Saturday; Monday week = 9 … 15 Nov
const NOW = '2026-11-14T09:00:00Z';

function task(overrides: Partial<Task> & { title: string }): Task {
  return { id: overrides.title, notes: '', date: TODAY, time: null, severity: null, doneOn: null, createdAt: NOW, updatedAt: NOW, ...overrides };
}

describe('task drafts', () => {
  it('requires a name and only allows a time with a date', () => {
    expect(validateTaskDraft({ ...emptyTaskDraft(), time: '10:00' })).toEqual({
      title: 'Give the task a name.',
      time: 'Pick a date to set a time.',
    });
  });

  it('creates and edits tasks, dropping a time when the date is removed', () => {
    const t = createTask({ title: '  Renew passport ', notes: ' Photos ', date: TODAY, time: '16:30', severity: 'high' }, 'p', NOW);
    expect(t).toMatchObject({ title: 'Renew passport', notes: 'Photos', date: TODAY, time: '16:30', severity: 'high', doneOn: null });
    expect(applyTaskEdit(t, { ...t, date: null }, NOW)).toMatchObject({ date: null, time: null });
    expect(setTaskDone(t, true, TODAY, NOW).doneOn).toBe(TODAY);
  });

  it('fills fields missing in tasks saved before they existed', () => {
    const old = normaliseTask({ id: 'x', title: 'Old', date: '2026-11-01', doneOn: null, createdAt: NOW } as Task);
    expect(old).toEqual({ id: 'x', title: 'Old', notes: '', date: '2026-11-01', time: null, severity: null, doneOn: null, createdAt: NOW, updatedAt: NOW });
  });
});

describe('tasksForToday', () => {
  it('splits overdue and today, sorts by time and severity, and leaves out undated and future tasks', () => {
    const list = tasksForToday(
      [
        task({ title: 'evening', time: '18:00' }),
        task({ title: 'morning', time: '08:00' }),
        task({ title: 'untimed high', severity: 'high' }),
        task({ title: 'untimed low', severity: 'low' }),
        task({ title: 'late', date: '2026-11-12' }),
        task({ title: 'someday', date: null }),
        task({ title: 'tomorrow', date: '2026-11-15' }),
        task({ title: 'done today', doneOn: TODAY }),
      ],
      TODAY,
    );
    expect(list.overdue.map((t) => t.title)).toEqual(['late']);
    expect(list.today.map((t) => t.title)).toEqual(['morning', 'evening', 'untimed high', 'untimed low']);
    expect(list.done.map((t) => t.title)).toEqual(['done today']);
  });
});

describe('groupTasks', () => {
  const tasks = [
    task({ title: 'late', date: '2026-11-10' }),
    task({ title: 'today' }),
    task({ title: 'next week', date: '2026-11-20', notes: 'bring the invoice' }),
    task({ title: 'someday', date: null }),
    task({ title: 'finished', doneOn: '2026-11-13' }),
  ];

  it('groups everything for "all", and one group per filter', () => {
    expect(groupTasks(tasks, TODAY, 'all').map((g) => g.key)).toEqual(['overdue', 'today', 'upcoming', 'undated', 'done']);
    expect(groupTasks(tasks, TODAY, 'undated').map((g) => g.tasks.map((t) => t.title))).toEqual([['someday']]);
  });

  it('searches names and notes', () => {
    expect(groupTasks(tasks, TODAY, 'all', 'INVOICE').flatMap((g) => g.tasks.map((t) => t.title))).toEqual(['next week']);
  });
});

describe('taskStats', () => {
  it('counts open, overdue, done per week, on-time rate and severity', () => {
    const s = taskStats(
      [
        task({ title: 'open high', severity: 'high' }),
        task({ title: 'overdue', date: '2026-11-10', severity: 'medium' }),
        task({ title: 'undated', date: null }),
        task({ title: 'on time', date: '2026-11-12', doneOn: '2026-11-11' }),
        task({ title: 'late', date: '2026-11-03', doneOn: '2026-11-05' }),
        task({ title: 'no date done', date: null, doneOn: '2026-11-13' }),
      ],
      TODAY,
      'monday',
    );
    expect(s).toMatchObject({ open: 3, overdue: 1, undated: 1, doneThisWeek: 2, doneLastWeek: 1, onTimeRate: 0.5 });
    expect(s.perWeek).toHaveLength(8);
    expect(s.perWeek.at(-1)).toEqual({ weekStart: '2026-11-09', count: 2 });
    expect(s.openBySeverity).toEqual({ high: 1, medium: 1, low: 0, none: 1 });
  });
});
