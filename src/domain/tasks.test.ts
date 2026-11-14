import { describe, expect, it } from 'vitest';
import { createTask, setTaskDone, tasksForToday } from './tasks';
import type { Task } from './types';

const TODAY = '2026-11-14';
const NOW = '2026-11-14T09:00:00Z';

function task(overrides: Partial<Task>): Task {
  return { id: overrides.title ?? 't', title: 't', date: TODAY, doneOn: null, createdAt: NOW, updatedAt: NOW, ...overrides };
}

describe('tasksForToday', () => {
  it('shows today’s tasks and carries unfinished ones over from earlier days, oldest first', () => {
    const list = tasksForToday(
      [
        task({ title: 'today', date: TODAY, createdAt: '2026-11-14T08:00:00Z' }),
        task({ title: 'monday', date: '2026-11-09' }),
        task({ title: 'wednesday', date: '2026-11-11' }),
        task({ title: 'old and done', date: '2026-11-10', doneOn: '2026-11-10' }),
        task({ title: 'tomorrow', date: '2026-11-15' }),
      ],
      TODAY,
    );
    expect(list.open.map((t) => t.title)).toEqual(['monday', 'wednesday', 'today']);
    expect(list.done).toEqual([]);
  });

  it('keeps tasks finished today in the done list, including carried-over ones', () => {
    const list = tasksForToday([task({ title: 'carried', date: '2026-11-12', doneOn: TODAY }), task({ title: 'fresh', doneOn: TODAY })], TODAY);
    expect(list.done.map((t) => t.title)).toEqual(['carried', 'fresh']);
    expect(list.open).toEqual([]);
  });
});

describe('task changes', () => {
  it('creates a trimmed task for today and records the day it was done', () => {
    const t = createTask('  Call the bank ', TODAY, 'id1', NOW);
    expect(t).toMatchObject({ id: 'id1', title: 'Call the bank', date: TODAY, doneOn: null });
    expect(setTaskDone(t, true, TODAY, NOW).doneOn).toBe(TODAY);
    expect(setTaskDone(setTaskDone(t, true, TODAY, NOW), false, TODAY, NOW).doneOn).toBeNull();
  });
});
