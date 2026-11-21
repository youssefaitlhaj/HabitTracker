import { describe, expect, it } from 'vitest';
import { addDays } from '@/domain/date';
import { isArchived } from '@/domain/schedule';
import { LedgerStats } from '@/domain/stats';
import { isOverdue, taskStats } from '@/domain/tasks';
import { buildExport, parseImport } from '@/domain/transfer';
import { demoAccount } from './demoData';

const TODAY = '2026-11-21';
const account = demoAccount(TODAY, 'Europe/Madrid');
const stats = new LedgerStats({ ...account, weekStart: 'monday', today: TODAY, accountCreated: account.createdAt.slice(0, 10) });
const habit = (name: string) => account.habits.find((h) => h.name === name)!;

describe('demo account', () => {
  it('passes the app’s own import checks', () => {
    const snapshot = { profile: account.settings, habits: account.habits, checkins: account.checkins, notes: account.notes, tasks: account.tasks ?? [] };
    const result = parseImport(JSON.stringify(buildExport(snapshot, `${TODAY}T10:00:00.000Z`)));
    expect(result.ok).toBe(true);
  });

  it('is the same on every visit on the same day, and moves with the date', () => {
    expect(demoAccount(TODAY, 'Europe/Madrid')).toEqual(account);
    expect(demoAccount(addDays(TODAY, 1), 'Europe/Madrid').habits[0]!.startDate).toBe(addDays(account.habits[0]!.startDate, 1));
  });

  it('only has check-ins while a habit is running, and none in the future', () => {
    for (const c of account.checkins) {
      const h = account.habits.find((x) => x.id === c.habitId)!;
      expect(c.date >= h.startDate && c.date <= TODAY).toBe(true);
      if (isArchived(h)) expect(c.date < h.pauses[0]!.from).toBe(true);
    }
  });

  it('tells a believable story: good months, a dip, a current streak, today half done', () => {
    const lastMonth = stats.rangeStats(addDays(TODAY, -30), addDays(TODAY, -1));
    const dip = stats.rangeStats(addDays(TODAY, -46), addDays(TODAY, -35));
    expect(lastMonth.completion).toBeGreaterThan(0.6);
    expect(lastMonth.completion).toBeLessThan(0.97);
    expect(dip.completion!).toBeLessThan(lastMonth.completion!);
    expect(stats.currentStreak(habit('Read 20 pages')).value).toBeGreaterThanOrEqual(14);

    const today = stats.daySummary(TODAY);
    expect(today.done).toBeGreaterThan(0);
    expect(today.done).toBeLessThan(today.scheduled);
    expect(account.habits.filter(isArchived)).toHaveLength(1);
    expect(habit('Tidy up for 15 minutes').schedules).toHaveLength(2);
  });

  it('has tasks of every kind: due today, overdue, upcoming, undated and done', () => {
    const tasks = account.tasks ?? [];
    expect(tasks.some((t) => t.date === TODAY && !t.doneOn && t.time)).toBe(true);
    expect(tasks.some((t) => isOverdue(t, TODAY))).toBe(true);
    expect(tasks.some((t) => !t.doneOn && t.date && t.date > TODAY)).toBe(true);
    expect(tasks.some((t) => !t.date)).toBe(true);
    expect(taskStats(tasks, TODAY, 'monday').perWeek.filter((w) => w.count > 0).length).toBeGreaterThanOrEqual(6);
  });
});
