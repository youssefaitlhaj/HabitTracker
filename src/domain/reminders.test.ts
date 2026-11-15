import { describe, expect, it } from 'vitest';
import { dueReminders, dueTaskReminders, reminderMessage, taskReminderKey, type ReminderInput } from './reminders';
import { checkinsFor, makeHabit, makeTask } from '@/test/factories';
import type { Habit } from './types';

const TODAY = '2026-11-10'; // Tuesday

function input(habits: Habit[], overrides: Partial<ReminderInput> = {}): ReminderInput {
  return { habits, checkins: [], weekStart: 'monday', today: TODAY, accountCreated: '2026-11-01', now: '08:00', sent: {}, ...overrides };
}

describe('dueReminders', () => {
  it('reminds once the time has come, for habits not done yet', () => {
    const walk = makeHabit({ reminder: '07:30' });
    const read = makeHabit({ reminder: '21:00' });
    expect(dueReminders(input([walk, read]))).toEqual([walk]);
  });

  it('skips habits that are done, have no reminder, or were already reminded today', () => {
    const done = makeHabit({ reminder: '07:00' });
    const none = makeHabit({ reminder: null });
    const sent = makeHabit({ reminder: '07:00' });
    const result = dueReminders(input([done, none, sent], { checkins: checkinsFor(done, [TODAY]), sent: { [sent.id]: TODAY } }));
    expect(result).toEqual([]);
  });

  it('reminds again on a new day', () => {
    const walk = makeHabit({ reminder: '07:00' });
    expect(dueReminders(input([walk], { sent: { [walk.id]: '2026-11-09' } }))).toEqual([walk]);
  });

  it('skips days the habit is not scheduled and archived habits', () => {
    const weekends = makeHabit({ reminder: '07:00', schedule: { type: 'days', days: [5, 6] } });
    const archived = makeHabit({ reminder: '07:00', pauses: [{ from: '2026-11-05', to: null }] });
    expect(dueReminders(input([weekends, archived]))).toEqual([]);
  });

  it('reminds weekly habits only until the weekly target is met', () => {
    const gym = makeHabit({ reminder: '07:00', schedule: { type: 'times', timesPerWeek: 1 } });
    expect(dueReminders(input([gym]))).toEqual([gym]);
    expect(dueReminders(input([gym], { checkins: checkinsFor(gym, ['2026-11-09']) }))).toEqual([]);
  });

  it('does not send stale reminders long after their time (e.g. after an outage)', () => {
    const walk = makeHabit({ reminder: '07:00' });
    expect(dueReminders(input([walk], { now: '11:30' }))).toEqual([]);
  });
});

describe('dueTaskReminders', () => {
  const at = (time: string, overrides = {}) => makeTask({ date: TODAY, time, ...overrides });
  const due = (tasks: ReturnType<typeof makeTask>[], now = '08:00', sent: Record<string, string> = {}) =>
    dueTaskReminders({ tasks, today: TODAY, now, sent });

  it('reminds at the task’s time on its day, for tasks not done yet', () => {
    const call = at('07:30');
    const later = at('21:00');
    expect(due([call, later])).toEqual([call]);
  });

  it('skips done tasks, tasks without a time, and tasks on other days', () => {
    const done = at('07:00', { doneOn: TODAY });
    const untimed = makeTask({ date: TODAY });
    const undated = makeTask();
    const tomorrow = at('07:00', { date: '2026-11-11' });
    const yesterday = at('07:00', { date: '2026-11-09' });
    expect(due([done, untimed, undated, tomorrow, yesterday])).toEqual([]);
  });

  it('reminds once, and again only if the date or time was changed afterwards', () => {
    const call = at('07:00');
    expect(due([call], '08:00', { [call.id]: taskReminderKey(call) })).toEqual([]);
    expect(due([call], '08:00', { [call.id]: '2026-11-10 06:00' })).toEqual([call]);
  });

  it('does not send stale reminders long after their time', () => {
    expect(due([at('07:00')], '11:30')).toEqual([]);
  });
});

describe('reminderMessage', () => {
  it('names one habit, or lists several', () => {
    const [a, b, c] = [makeHabit({ name: 'Morning walk' }), makeHabit({ name: 'Read' }), makeHabit({ name: 'Stretch' })];
    expect(reminderMessage([a!]).body).toBe('Time for Morning walk.');
    expect(reminderMessage([a!, b!, c!]).body).toBe('3 habits are waiting: Morning walk, Read, Stretch.');
  });

  it('names tasks too, alone or after the habits', () => {
    const walk = makeHabit({ name: 'Morning walk' });
    const [rent, call] = [makeTask({ title: 'Pay rent' }), makeTask({ title: 'Call mum' })];
    expect(reminderMessage([], [rent]).body).toBe('To do: Pay rent.');
    expect(reminderMessage([], [rent, call]).body).toBe('2 tasks are due: Pay rent, Call mum.');
    expect(reminderMessage([walk], [rent]).body).toBe('Time for Morning walk. To do: Pay rent.');
  });
});
