import { addDays, diffDays, eachDay, maxDate, minDate, startOfWeek } from './date';
import { currentSchedule, isScheduledOn, isWeekly, versionOn } from './schedule';
import type { Checkin, Habit, LocalDate, WeekStart } from './types';

/**
 * The single source of truth for every number Ledger shows (design §8.3).
 * Screens never compute streaks or percentages themselves; they ask this class.
 */

export type DayStatus =
  | 'done' // checked off
  | 'missed' // scheduled, in the past, not done, not excused
  | 'rest' // scheduled, not done, excused by the weekly rest allowance
  | 'pending' // scheduled today, not done yet
  | 'future'
  | 'unscheduled' // day habit not asked for on this weekday
  | 'open' // weekly habit, not checked this day
  | 'inactive'; // before the start date or archived

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export interface Streak {
  value: number;
  unit: 'days' | 'weeks';
}

export interface WeekProgress {
  done: number;
  target: number;
}

export interface DaySummary {
  date: LocalDate;
  scheduled: number;
  done: number;
  ratio: number;
  level: HeatLevel;
  /** No pending habits left. */
  complete: boolean;
  perfect: boolean;
  /** Nothing scheduled that day. */
  skipped: boolean;
  future: boolean;
}

export interface RangeStats {
  from: LocalDate;
  to: LocalDate;
  /** 0…1, or null when nothing was scheduled. */
  completion: number | null;
  perfectDays: number;
  checks: number;
  daysTracked: number;
}

export interface StatsInput {
  habits: Habit[];
  checkins: Checkin[];
  weekStart: WeekStart;
  today: LocalDate;
  accountCreated: LocalDate;
}

export function levelForRatio(ratio: number): HeatLevel {
  if (ratio <= 0) return 0;
  if (ratio < 0.4) return 1;
  if (ratio < 0.7) return 2;
  if (ratio < 1) return 3;
  return 4;
}

export class LedgerStats {
  readonly today: LocalDate;
  readonly weekStart: WeekStart;
  private readonly habits: Habit[];
  private readonly checkins: Checkin[];
  private readonly accountCreated: LocalDate;
  private readonly doneByHabit = new Map<string, Set<LocalDate>>();
  private readonly restCache = new Map<string, Set<LocalDate>>();
  private readonly summaryCache = new Map<LocalDate, DaySummary>();

  constructor(input: StatsInput) {
    this.today = input.today;
    this.weekStart = input.weekStart;
    this.habits = input.habits;
    this.checkins = input.checkins;
    this.accountCreated = input.accountCreated;
    for (const c of input.checkins) {
      const set = this.doneByHabit.get(c.habitId) ?? new Set<LocalDate>();
      set.add(c.date);
      this.doneByHabit.set(c.habitId, set);
    }
  }

  isDone(habitId: string, date: LocalDate): boolean {
    return this.doneByHabit.get(habitId)?.has(date) ?? false;
  }

  totalCheckins(habit: Habit): number {
    return this.doneByHabit.get(habit.id)?.size ?? 0;
  }

  earliestDate(): LocalDate {
    return this.habits.reduce((min, h) => minDate(min, h.startDate), this.accountCreated);
  }

  dayStatus(habit: Habit, date: LocalDate): DayStatus {
    const version = versionOn(habit, date);
    if (!version) return 'inactive';
    if (date > this.today) return 'future';
    const done = this.isDone(habit.id, date);
    if (isWeekly(version)) return done ? 'done' : 'open';
    if (!isScheduledOn(version, date)) return 'unscheduled';
    if (done) return 'done';
    if (date === this.today) return 'pending';
    return this.restDaysOfWeek(habit, date).has(date) ? 'rest' : 'missed';
  }

  /** True when the habit counts per day on this date (an active, non-weekly schedule). */
  isDayHabitOn(habit: Habit, date: LocalDate): boolean {
    const version = versionOn(habit, date);
    return !!version && !isWeekly(version);
  }

  weekProgress(habit: Habit, date: LocalDate): WeekProgress | null {
    const weekStart = startOfWeek(date, this.weekStart);
    const days = eachDay(weekStart, addDays(weekStart, 6));
    const reference = [...days].reverse().find((d) => d <= this.today && versionOn(habit, d));
    const version = reference ? versionOn(habit, reference) : null;
    if (!version || !isWeekly(version)) return null;
    const done = days.filter((d) => versionOn(habit, d) && this.isDone(habit.id, d)).length;
    return { done, target: version.timesPerWeek ?? 1 };
  }

  currentStreak(habit: Habit): Streak {
    return this.isWeeklyNow(habit)
      ? { value: this.weeklyStreak(habit, 'current'), unit: 'weeks' }
      : { value: this.dailyStreak(habit, 'current'), unit: 'days' };
  }

  bestStreak(habit: Habit): Streak {
    return this.isWeeklyNow(habit)
      ? { value: this.weeklyStreak(habit, 'best'), unit: 'weeks' }
      : { value: this.dailyStreak(habit, 'best'), unit: 'days' };
  }

  daySummary(date: LocalDate): DaySummary {
    const cached = this.summaryCache.get(date);
    if (cached) return cached;
    let scheduled = 0;
    let done = 0;
    let pending = 0;
    if (date <= this.today) {
      for (const habit of this.habits) {
        if (!this.isDayHabitOn(habit, date)) continue;
        const status = this.dayStatus(habit, date);
        if (status === 'done') {
          scheduled += 1;
          done += 1;
        } else if (status === 'missed' || status === 'pending') {
          scheduled += 1;
          if (status === 'pending') pending += 1;
        }
      }
    }
    const ratio = scheduled ? done / scheduled : 0;
    const summary: DaySummary = {
      date,
      scheduled,
      done,
      ratio,
      level: scheduled ? levelForRatio(ratio) : 0,
      complete: pending === 0,
      perfect: scheduled > 0 && done === scheduled,
      skipped: scheduled === 0,
      future: date > this.today,
    };
    this.summaryCache.set(date, summary);
    return summary;
  }

  perfectDayStreak(): number {
    let count = 0;
    for (let d = this.today; d >= this.earliestDate(); d = addDays(d, -1)) {
      const s = this.daySummary(d);
      if (s.skipped) continue;
      if (s.perfect) count += 1;
      else if (d === this.today) continue;
      else break;
    }
    return count;
  }

  rangeStats(from: LocalDate, to: LocalDate): RangeStats {
    const start = maxDate(from, this.earliestDate());
    const end = minDate(to, this.today);
    if (start > end) return { from: start, to: end, completion: null, perfectDays: 0, checks: 0, daysTracked: 0 };
    const days = eachDay(start, end);
    return {
      from: start,
      to: end,
      completion: this.completion(this.habits, start, end),
      perfectDays: days.filter((d) => this.daySummary(d).perfect).length,
      checks: this.checkins.filter((c) => c.date >= start && c.date <= end).length,
      daysTracked: days.length,
    };
  }

  habitCompletion(habit: Habit, from: LocalDate, to: LocalDate): number | null {
    const start = maxDate(from, habit.startDate);
    const end = minDate(to, this.today);
    return start > end ? null : this.completion([habit], start, end);
  }

  // ── internals ──────────────────────────────────────────────

  private isWeeklyNow(habit: Habit): boolean {
    return isWeekly(versionOn(habit, this.today) ?? currentSchedule(habit));
  }

  /** Missed scheduled days of the week that the rest allowance excuses, earliest first. */
  private restDaysOfWeek(habit: Habit, date: LocalDate): Set<LocalDate> {
    const weekStart = startOfWeek(date, this.weekStart);
    const key = `${habit.id}|${weekStart}`;
    const cached = this.restCache.get(key);
    if (cached) return cached;
    const rests = new Set<LocalDate>();
    const lastPast = minDate(addDays(weekStart, 6), addDays(this.today, -1));
    for (const d of eachDay(weekStart, lastPast)) {
      const version = versionOn(habit, d);
      if (!version || isWeekly(version) || !isScheduledOn(version, d) || this.isDone(habit.id, d)) continue;
      if (rests.size < version.restDaysPerWeek) rests.add(d);
    }
    this.restCache.set(key, rests);
    return rests;
  }

  private dailyStreak(habit: Habit, mode: 'current' | 'best'): number {
    if (mode === 'current') {
      let count = 0;
      for (let d = this.today; d >= habit.startDate; d = addDays(d, -1)) {
        const status = this.dayStatus(habit, d);
        if (status === 'done') count += 1;
        else if (status === 'missed') break;
      }
      return count;
    }
    let run = 0;
    let best = 0;
    for (const d of eachDay(habit.startDate, this.today)) {
      const status = this.dayStatus(habit, d);
      if (status === 'done') best = Math.max(best, ++run);
      else if (status === 'missed') run = 0;
    }
    return best;
  }

  private weeklyStreak(habit: Habit, mode: 'current' | 'best'): number {
    const currentWeek = startOfWeek(this.today, this.weekStart);
    const firstWeek = startOfWeek(habit.startDate, this.weekStart);
    const weeks: LocalDate[] = [];
    for (let w = firstWeek; w <= currentWeek; w = addDays(w, 7)) weeks.push(w);

    const met = (w: LocalDate): boolean | null => {
      const p = this.weekProgress(habit, w);
      return p ? p.done >= p.target : null;
    };

    if (mode === 'current') {
      let count = 0;
      for (const w of weeks.reverse()) {
        const result = met(w);
        if (result === null) continue;
        if (result) count += 1;
        else if (w === currentWeek) continue;
        else break;
      }
      return count;
    }
    let run = 0;
    let best = 0;
    for (const w of weeks) {
      const result = met(w);
      if (result === null) continue;
      if (result) best = Math.max(best, ++run);
      else if (w !== currentWeek) run = 0;
    }
    return best;
  }

  /** Done ÷ expected over a range; rest days and pending today are left out (design §8.3). */
  private completion(habits: Habit[], start: LocalDate, end: LocalDate): number | null {
    let num = 0;
    let den = 0;
    for (const habit of habits) {
      for (const d of eachDay(start, end)) {
        if (!this.isDayHabitOn(habit, d)) continue;
        const status = this.dayStatus(habit, d);
        if (status === 'done') {
          num += 1;
          den += 1;
        } else if (status === 'missed') den += 1;
      }
      for (let w = startOfWeek(start, this.weekStart); w <= end; w = addDays(w, 7)) {
        const progress = this.weekProgress(habit, w);
        if (!progress) continue;
        const overlap = diffDays(maxDate(w, start), minDate(addDays(w, 6), end)) + 1;
        const share = overlap / 7;
        num += (Math.min(progress.done, progress.target) / progress.target) * share;
        den += share;
      }
    }
    return den > 0 ? num / den : null;
  }
}
