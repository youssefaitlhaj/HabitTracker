/** Calendar date without time, always `YYYY-MM-DD`, interpreted in the user's time zone. */
export type LocalDate = string;

export type WeekStart = 'monday' | 'sunday';

/** 0 = Monday … 6 = Sunday (ISO order, independent of the user's week start). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const CATEGORIES = ['health', 'mind', 'learning', 'home', 'social'] as const;
export type Category = (typeof CATEGORIES)[number];

export const HABIT_COLORS = ['whisky', 'oak', 'amber', 'sage', 'clay', 'slate'] as const;
export type HabitColor = (typeof HABIT_COLORS)[number];

export type ScheduleType = 'daily' | 'days' | 'times';

export interface Schedule {
  type: ScheduleType;
  /** Weekdays for `days` schedules, otherwise null. */
  days: Weekday[] | null;
  /** Target for `times` schedules, otherwise null. */
  timesPerWeek: number | null;
  /** Missed scheduled days per week that are excused. Ignored for `times`. */
  restDaysPerWeek: number;
}

/** A schedule that applies from `effectiveFrom` until the next version. */
export interface ScheduleVersion extends Schedule {
  effectiveFrom: LocalDate;
}

/** An archived period. `to === null` means the habit is archived right now. */
export interface Pause {
  from: LocalDate;
  to: LocalDate | null;
}

export interface Habit {
  id: string;
  name: string;
  category: Category;
  color: HabitColor;
  reminder: string | null;
  startDate: LocalDate;
  why: string;
  order: number;
  schedules: ScheduleVersion[];
  pauses: Pause[];
  createdAt: string;
  updatedAt: string;
}

export interface Checkin {
  habitId: string;
  date: LocalDate;
}

export interface Note {
  id: string;
  habitId: string;
  date: LocalDate;
  text: string;
  createdAt: string;
}

/** A one-off to-do for a day. Unfinished tasks carry over to the next days. */
export interface Task {
  id: string;
  title: string;
  /** The day the task was added for. */
  date: LocalDate;
  /** The day it was checked off, or null while open. */
  doneOn: LocalDate | null;
  createdAt: string;
  updatedAt: string;
}

/** Settings the user controls; part of every export. */
export interface ProfileSettings {
  name: string;
  timezone: string;
  weekStart: WeekStart;
  defaultRestDays: number;
  showStreaks: boolean;
  celebrate: boolean;
}

export interface Profile extends ProfileSettings {
  id: string;
  email: string;
  avatarUrl: string | null;
  onboarded: boolean;
  lastExportAt: string | null;
  createdAt: string;
}

/** Everything a user owns, as moved by export / import. */
export interface Snapshot {
  profile: ProfileSettings;
  habits: Habit[];
  checkins: Checkin[];
  notes: Note[];
  tasks: Task[];
}

/** What the habit editor produces. */
export interface HabitDraft {
  name: string;
  category: Category;
  color: HabitColor;
  schedule: Schedule;
  startDate: LocalDate;
  reminder: string | null;
  why: string;
}
