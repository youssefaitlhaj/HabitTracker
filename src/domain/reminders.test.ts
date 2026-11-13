import { describe, expect, it } from 'vitest';
import { dueReminders, reminderMessage, type ReminderInput } from './reminders';
import { checkinsFor, makeHabit } from '@/test/factories';
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

describe('reminderMessage', () => {
  it('names one habit, or lists several', () => {
    const [a, b, c] = [makeHabit({ name: 'Morning walk' }), makeHabit({ name: 'Read' }), makeHabit({ name: 'Stretch' })];
    expect(reminderMessage([a!]).body).toBe('Time for Morning walk.');
    expect(reminderMessage([a!, b!, c!]).body).toBe('3 habits are waiting: Morning walk, Read, Stretch.');
  });
});
