import { describe, expect, it } from 'vitest';
import { LedgerStats, levelForRatio } from './stats';
import { checkinsBetween, checkinsFor, makeHabit } from '@/test/factories';
import type { Checkin, Habit } from './types';

// 2026-11-10 is a Tuesday. Week (Monday start) = 9 … 15 Nov.
const TODAY = '2026-11-10';

function stats(habits: Habit[], checkins: Checkin[], weekStart: 'monday' | 'sunday' = 'monday') {
  return new LedgerStats({ habits, checkins, weekStart, today: TODAY, accountCreated: '2026-11-01' });
}

describe('levelForRatio', () => {
  it('maps ratios to the five heat levels', () => {
    expect([0, 0.2, 0.39, 0.4, 0.69, 0.7, 0.99, 1].map(levelForRatio)).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
  });
});

describe('day status', () => {
  it('marks done, pending, future, missed and before-start days', () => {
    const h = makeHabit({ startDate: '2026-11-05' });
    const s = stats([h], checkinsFor(h, ['2026-11-05', '2026-11-07']));
    expect(s.dayStatus(h, '2026-11-04')).toBe('inactive');
    expect(s.dayStatus(h, '2026-11-05')).toBe('done');
    expect(s.dayStatus(h, '2026-11-06')).toBe('missed');
    expect(s.dayStatus(h, TODAY)).toBe('pending');
    expect(s.dayStatus(h, '2026-11-11')).toBe('future');
  });

  it('treats the earliest misses in a week as rest days, up to the allowance', () => {
    const h = makeHabit({ startDate: '2026-11-02', schedule: { restDaysPerWeek: 1 } });
    // Week 2–8 Nov: missed Wed 4 and Fri 6.
    const s = stats([h], checkinsBetween(h, '2026-11-02', '2026-11-09', ['2026-11-04', '2026-11-06']));
    expect(s.dayStatus(h, '2026-11-04')).toBe('rest');
    expect(s.dayStatus(h, '2026-11-06')).toBe('missed');
  });

  it('respects the user week start for rest allowances', () => {
    const h = makeHabit({ startDate: '2026-11-01', schedule: { restDaysPerWeek: 1 } });
    // Missed Sun 8 and Mon 9. Monday weeks: different weeks → both rest. Sunday weeks: same week → one missed.
    const checkins = checkinsBetween(h, '2026-11-01', '2026-11-09', ['2026-11-08', '2026-11-09']);
    expect([stats([h], checkins, 'monday').dayStatus(h, '2026-11-09')]).toEqual(['rest']);
    expect(stats([h], checkins, 'sunday').dayStatus(h, '2026-11-09')).toBe('missed');
  });

  it('ignores days that are not scheduled', () => {
    const h = makeHabit({ schedule: { type: 'days', days: [0, 2, 4] } }); // Mon, Wed, Fri
    const s = stats([h], []);
    expect(s.dayStatus(h, '2026-11-03')).toBe('unscheduled');
    expect(s.dayStatus(h, '2026-11-04')).toBe('missed');
  });

  it('excludes archived periods entirely', () => {
    const h = makeHabit({ pauses: [{ from: '2026-11-04', to: '2026-11-06' }] });
    const s = stats([h], []);
    expect(s.dayStatus(h, '2026-11-05')).toBe('inactive');
    expect(s.dayStatus(h, '2026-11-07')).toBe('missed');
  });

  it('judges past days by the schedule version active then', () => {
    const h = makeHabit({
      startDate: '2026-11-02',
      schedules: [
        { type: 'daily', days: null, timesPerWeek: null, restDaysPerWeek: 0, effectiveFrom: '2026-11-02' },
        { type: 'days', days: [0], timesPerWeek: null, restDaysPerWeek: 0, effectiveFrom: '2026-11-07' },
      ],
    });
    const s = stats([h], []);
    expect(s.dayStatus(h, '2026-11-03')).toBe('missed');
    expect(s.dayStatus(h, '2026-11-08')).toBe('unscheduled');
  });
});

describe('streaks for day habits', () => {
  it('counts done days back from today, skipping today while pending', () => {
    const h = makeHabit({ startDate: '2026-11-02' });
    const s = stats([h], checkinsBetween(h, '2026-11-05', '2026-11-09'));
    expect(s.currentStreak(h)).toEqual({ value: 5, unit: 'days' });
  });

  it('includes today once done', () => {
    const h = makeHabit({ startDate: '2026-11-08' });
    expect(stats([h], checkinsBetween(h, '2026-11-08', TODAY)).currentStreak(h).value).toBe(3);
  });

  it('keeps the streak alive across rest days without counting them', () => {
    const h = makeHabit({ startDate: '2026-11-02', schedule: { restDaysPerWeek: 1 } });
    const s = stats([h], checkinsBetween(h, '2026-11-02', '2026-11-09', ['2026-11-05']));
    expect(s.currentStreak(h).value).toBe(7);
  });

  it('computes the best streak ever', () => {
    const h = makeHabit({ startDate: '2026-11-01' });
    const s = stats([h], [...checkinsBetween(h, '2026-11-01', '2026-11-04'), ...checkinsBetween(h, '2026-11-08', '2026-11-09')]);
    expect(s.bestStreak(h).value).toBe(4);
    expect(s.currentStreak(h).value).toBe(2);
  });
});

describe('weekly habits', () => {
  const weekly = () => makeHabit({ startDate: '2026-10-19', schedule: { type: 'times', timesPerWeek: 2 } });

  it('reports progress for the current week', () => {
    const h = weekly();
    const s = stats([h], checkinsFor(h, ['2026-11-09']));
    expect(s.weekProgress(h, TODAY)).toEqual({ done: 1, target: 2 });
    expect(s.dayStatus(h, TODAY)).toBe('open');
  });

  it('counts met weeks and does not break on the week in progress', () => {
    const h = weekly();
    const s = stats([h], checkinsFor(h, ['2026-10-27', '2026-10-29', '2026-11-03', '2026-11-05']));
    expect(s.currentStreak(h)).toEqual({ value: 2, unit: 'weeks' });
  });

  it('stays out of per-day summaries', () => {
    const day = makeHabit({ startDate: '2026-11-02' });
    const h = weekly();
    const s = stats([day, h], [...checkinsFor(day, ['2026-11-09']), ...checkinsFor(h, ['2026-11-09'])]);
    expect(s.daySummary('2026-11-09')).toMatchObject({ scheduled: 1, done: 1, perfect: true });
  });
});

describe('day summary and perfect days', () => {
  it('builds the ring numbers for today', () => {
    const a = makeHabit();
    const b = makeHabit();
    const s = stats([a, b], checkinsFor(a, [TODAY]));
    expect(s.daySummary(TODAY)).toMatchObject({ scheduled: 2, done: 1, complete: false, perfect: false, level: 2 });
  });

  it('removes rest days from the day and still allows a perfect day', () => {
    const a = makeHabit({ startDate: '2026-11-02', schedule: { restDaysPerWeek: 1 } });
    const b = makeHabit({ startDate: '2026-11-02' });
    const s = stats([a, b], [...checkinsFor(b, ['2026-11-09'])]);
    // On Mon 9, `a` missed but it's its first miss of the week → rest.
    expect(s.daySummary('2026-11-09')).toMatchObject({ scheduled: 1, done: 1, perfect: true });
  });

  it('counts the perfect-day streak, skipping empty days and pending today', () => {
    const h = makeHabit({ startDate: '2026-11-02', schedule: { type: 'days', days: [0, 1, 2, 3, 4] } }); // Mon–Fri
    const s = stats([h], checkinsFor(h, ['2026-11-05', '2026-11-06', '2026-11-09']));
    // Thu 5, Fri 6, (weekend skipped), Mon 9 perfect, today pending → 3
    expect(s.perfectDayStreak()).toBe(3);
  });
});

describe('range stats', () => {
  it('summarises completion, perfect days, check-ins and tracked days', () => {
    const h = makeHabit({ startDate: '2026-11-02' });
    const s = stats([h], checkinsBetween(h, '2026-11-02', '2026-11-09', ['2026-11-04']));
    const r = s.rangeStats('2026-11-02', '2026-11-30');
    expect(r.checks).toBe(7);
    expect(r.perfectDays).toBe(7);
    expect(r.daysTracked).toBe(9);
    expect(r.completion).toBeCloseTo(7 / 8); // today is pending and not counted
  });

  it('does not count excused rest days against completion', () => {
    const h = makeHabit({ startDate: '2026-11-02', schedule: { restDaysPerWeek: 1 } });
    const s = stats([h], checkinsBetween(h, '2026-11-02', '2026-11-08', ['2026-11-04']));
    expect(s.rangeStats('2026-11-02', '2026-11-08').completion).toBe(1);
  });

  it('uses the earliest habit start when it is before the account was created', () => {
    const h = makeHabit({ startDate: '2026-10-01' });
    expect(stats([h], []).earliestDate()).toBe('2026-10-01');
  });
});
