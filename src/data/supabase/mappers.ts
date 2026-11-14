import type { Checkin, Habit, Note, Profile, ProfileSettings, Task, Weekday } from '@/domain/types';
import type { ProfilePatch } from '../ports';

/** Row shapes returned by Supabase and their conversion to domain objects. */

export interface ProfileRow {
  id: string;
  display_name: string;
  avatar_path: string | null;
  timezone: string;
  week_start: 'monday' | 'sunday';
  default_rest_days: number;
  show_streaks: boolean;
  celebrate: boolean;
  onboarded_at: string | null;
  last_export_at: string | null;
  created_at: string;
}

export interface HabitRow {
  id: string;
  name: string;
  category: Habit['category'];
  color: Habit['color'];
  reminder_time: string | null;
  start_date: string;
  why: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  habit_schedules: {
    effective_from: string;
    schedule_type: Habit['schedules'][number]['type'];
    schedule_days: number[] | null;
    times_per_week: number | null;
    rest_days_per_week: number;
  }[];
  habit_pauses: { from_date: string; to_date: string | null }[];
}

export const HABIT_SELECT = '*, habit_schedules(*), habit_pauses(*)';

export function settingsFromRow(row: ProfileRow): ProfileSettings {
  return {
    name: row.display_name,
    timezone: row.timezone,
    weekStart: row.week_start,
    defaultRestDays: row.default_rest_days,
    showStreaks: row.show_streaks,
    celebrate: row.celebrate,
  };
}

export function profileFromRow(row: ProfileRow, email: string, avatarUrl: string | null): Profile {
  return {
    ...settingsFromRow(row),
    id: row.id,
    email,
    avatarUrl,
    onboarded: !!row.onboarded_at,
    lastExportAt: row.last_export_at,
    createdAt: row.created_at,
  };
}

export function profilePatchToRow(patch: ProfilePatch): Partial<ProfileRow> & { updated_at: string } {
  const row: Partial<ProfileRow> & { updated_at: string } = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.display_name = patch.name;
  if (patch.timezone !== undefined) row.timezone = patch.timezone;
  if (patch.weekStart !== undefined) row.week_start = patch.weekStart;
  if (patch.defaultRestDays !== undefined) row.default_rest_days = patch.defaultRestDays;
  if (patch.showStreaks !== undefined) row.show_streaks = patch.showStreaks;
  if (patch.celebrate !== undefined) row.celebrate = patch.celebrate;
  if (patch.onboarded) row.onboarded_at = new Date().toISOString();
  return row;
}

export function habitFromRow(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    color: row.color,
    reminder: row.reminder_time,
    startDate: row.start_date,
    why: row.why,
    order: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    schedules: row.habit_schedules.map((s) => ({
      effectiveFrom: s.effective_from,
      type: s.schedule_type,
      days: s.schedule_days ? (s.schedule_days as Weekday[]) : null,
      timesPerWeek: s.times_per_week,
      restDaysPerWeek: s.rest_days_per_week,
    })),
    pauses: row.habit_pauses.map((p) => ({ from: p.from_date, to: p.to_date })),
  };
}

export const checkinFromRow = (row: { habit_id: string; date: string }): Checkin => ({ habitId: row.habit_id, date: row.date });

export interface TaskRow {
  id: string;
  user_id?: string;
  title: string;
  notes: string | null;
  date: string | null;
  time: string | null;
  severity: Task['severity'];
  done_on: string | null;
  created_at: string;
  updated_at: string;
}

export const taskFromRow = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  notes: row.notes ?? '',
  date: row.date,
  time: row.time,
  severity: row.severity,
  doneOn: row.done_on,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const taskToRow = (task: Task, userId: string): TaskRow => ({
  id: task.id,
  user_id: userId,
  title: task.title,
  notes: task.notes,
  date: task.date,
  time: task.time,
  severity: task.severity,
  done_on: task.doneOn,
  created_at: task.createdAt,
  updated_at: task.updatedAt,
});

export const noteFromRow = (row: { id: string; habit_id: string; date: string; text: string; created_at: string }): Note => ({
  id: row.id,
  habitId: row.habit_id,
  date: row.date,
  text: row.text,
  createdAt: row.created_at,
});
