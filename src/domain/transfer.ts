import { z } from 'zod';
import { isLocalDate } from './date';
import { isArchived } from './schedule';
import { CATEGORIES, HABIT_COLORS } from './types';
import type { Habit, LocalDate, Snapshot, Weekday } from './types';

/** JSON export / import format, version 1 (design §8.7). */

export const EXPORT_VERSION = 1;
export const IMPORT_MAX_BYTES = 10 * 1024 * 1024;

const WEEKDAY_NAMES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const localDate = z.string().refine(isLocalDate, 'must be a date like 2026-11-10');

const scheduleSchema = z.object({
  effectiveFrom: localDate,
  type: z.enum(['daily', 'days', 'times']),
  days: z.array(z.enum(WEEKDAY_NAMES)).nullable(),
  timesPerWeek: z.number().int().min(1).max(7).nullable(),
  restDaysPerWeek: z.number().int().min(0).max(2),
});

const habitSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  category: z.enum(CATEGORIES),
  color: z.enum(HABIT_COLORS),
  schedules: z.array(scheduleSchema).min(1),
  pauses: z.array(z.object({ from: localDate, to: localDate.nullable() })),
  reminder: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  startDate: localDate,
  why: z.string().max(500),
  archived: z.boolean(),
  order: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const exportSchema = z
  .object({
    app: z.literal('ledger'),
    version: z.number().int(),
    exportedAt: z.string(),
    profile: z.object({
      name: z.string().max(80),
      timezone: z.string().min(1),
      weekStart: z.enum(['monday', 'sunday']),
      defaultRestDays: z.number().int().min(0).max(2),
      showStreaks: z.boolean(),
      celebrate: z.boolean(),
    }),
    habits: z.array(habitSchema),
    checkins: z.array(z.object({ habitId: z.string().uuid(), date: localDate })),
    notes: z.array(
      z.object({ id: z.string().uuid(), habitId: z.string().uuid(), date: localDate, text: z.string().max(500), createdAt: z.string() }),
    ),
  })
  .superRefine((file, ctx) => {
    const ids = new Set(file.habits.map((h) => h.id));
    const unknown = [...file.checkins, ...file.notes].find((x) => !ids.has(x.habitId));
    if (unknown) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `refers to unknown habit ${unknown.habitId}` });
  });

export type ExportFile = z.infer<typeof exportSchema>;

export type ImportResult = { ok: true; snapshot: Snapshot; summary: ImportSummary } | { ok: false; error: string };

export interface ImportSummary {
  habits: number;
  checkins: number;
  notes: number;
}

export function exportFileName(today: LocalDate): string {
  return `ledger-export-${today}.json`;
}

export function buildExport(snapshot: Snapshot, now: string): ExportFile {
  return {
    app: 'ledger',
    version: EXPORT_VERSION,
    exportedAt: now,
    profile: snapshot.profile,
    habits: snapshot.habits.map((h) => ({
      id: h.id,
      name: h.name,
      category: h.category,
      color: h.color,
      schedules: h.schedules.map((s) => ({ ...s, days: s.days ? s.days.map((d) => WEEKDAY_NAMES[d]) : null })),
      pauses: h.pauses,
      reminder: h.reminder,
      startDate: h.startDate,
      why: h.why,
      archived: isArchived(h),
      order: h.order,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    })),
    checkins: snapshot.checkins,
    notes: snapshot.notes,
  };
}

export function summarise(snapshot: Snapshot): ImportSummary {
  return { habits: snapshot.habits.length, checkins: snapshot.checkins.length, notes: snapshot.notes.length };
}

export function parseImport(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON. Make sure it is an unedited Ledger export.' };
  }
  if (!raw || typeof raw !== 'object' || (raw as { app?: unknown }).app !== 'ledger') {
    return { ok: false, error: 'This looks like JSON, but not a Ledger export.' };
  }
  const version = (raw as { version?: unknown }).version;
  if (typeof version === 'number' && version > EXPORT_VERSION) {
    return { ok: false, error: 'This file was made by a newer version of Ledger. Update the app and try again.' };
  }
  const parsed = exportSchema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.') || 'file'}: ${i.message}`);
    return { ok: false, error: `Some fields are not right. ${problems.join('; ')}.` };
  }
  const snapshot = toSnapshot(parsed.data);
  return { ok: true, snapshot, summary: summarise(snapshot) };
}

function toSnapshot(file: ExportFile): Snapshot {
  const habits: Habit[] = file.habits.map(({ archived: _derived, ...h }) => ({
    ...h,
    schedules: h.schedules.map((s) => ({
      ...s,
      days: s.days ? s.days.map((d) => WEEKDAY_NAMES.indexOf(d) as Weekday) : null,
    })),
  }));
  return { profile: file.profile, habits, checkins: dedupeCheckins(file.checkins), notes: file.notes };
}

function dedupeCheckins(checkins: Snapshot['checkins']): Snapshot['checkins'] {
  const seen = new Map(checkins.map((c) => [`${c.habitId}|${c.date}`, c]));
  return [...seen.values()];
}

/**
 * Merge (design §8.7): new habits are added, existing ones are replaced when the incoming copy
 * is newer, check-ins and notes are combined. The user's own settings are kept.
 */
export function mergeSnapshots(current: Snapshot, incoming: Snapshot): Snapshot {
  const habits = new Map(current.habits.map((h) => [h.id, h]));
  for (const h of incoming.habits) {
    const existing = habits.get(h.id);
    if (!existing || h.updatedAt > existing.updatedAt) habits.set(h.id, h);
  }
  const notes = new Map(current.notes.map((n) => [n.id, n]));
  for (const n of incoming.notes) if (!notes.has(n.id)) notes.set(n.id, n);
  return {
    profile: current.profile,
    habits: [...habits.values()],
    checkins: dedupeCheckins([...current.checkins, ...incoming.checkins]),
    notes: [...notes.values()],
  };
}
