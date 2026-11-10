import { addDays } from './date';
import { currentSchedule, isArchived, sameSchedule } from './schedule';
import type { Habit, HabitDraft, LocalDate, Schedule } from './types';

export const NAME_MAX = 60;
export const MAX_REST_DAYS = 2;

export interface HabitDraftErrors {
  name?: string;
  days?: string;
  startDate?: string;
}

export function validateHabitDraft(draft: HabitDraft, earliestCheckin: LocalDate | null): HabitDraftErrors {
  const errors: HabitDraftErrors = {};
  if (!draft.name.trim()) errors.name = 'Give your habit a name.';
  else if (draft.name.trim().length > NAME_MAX) errors.name = `Keep it under ${NAME_MAX} characters.`;
  if (draft.schedule.type === 'days' && !(draft.schedule.days ?? []).length) errors.days = 'Pick at least one day of the week.';
  if (earliestCheckin && draft.startDate > earliestCheckin)
    errors.startDate = 'This habit already has check-ins before that date.';
  return errors;
}

export const hasErrors = (errors: object): boolean => Object.values(errors).some(Boolean);

/** Removes fields that don't apply to the schedule type, so stored data stays clean. */
export function normaliseSchedule(schedule: Schedule): Schedule {
  return {
    type: schedule.type,
    days: schedule.type === 'days' ? [...(schedule.days ?? [])].sort() : null,
    timesPerWeek: schedule.type === 'times' ? Math.min(7, Math.max(1, schedule.timesPerWeek ?? 3)) : null,
    restDaysPerWeek: schedule.type === 'times' ? 0 : Math.min(MAX_REST_DAYS, Math.max(0, schedule.restDaysPerWeek)),
  };
}

export function draftFromHabit(habit: Habit): HabitDraft {
  const { effectiveFrom: _ignored, ...schedule } = currentSchedule(habit);
  return {
    name: habit.name,
    category: habit.category,
    color: habit.color,
    schedule,
    startDate: habit.startDate,
    reminder: habit.reminder,
    why: habit.why,
  };
}

export function createHabit(draft: HabitDraft, id: string, order: number, now: string): Habit {
  return {
    id,
    name: draft.name.trim(),
    category: draft.category,
    color: draft.color,
    reminder: draft.reminder,
    startDate: draft.startDate,
    why: draft.why.trim(),
    order,
    schedules: [{ ...normaliseSchedule(draft.schedule), effectiveFrom: draft.startDate }],
    pauses: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Applies an edit while keeping history (design §8.3): a changed schedule becomes a new
 * version effective today; earlier days keep the schedule that applied then.
 */
export function applyHabitEdit(habit: Habit, draft: HabitDraft, today: LocalDate, now: string): Habit {
  const schedule = normaliseSchedule(draft.schedule);
  let schedules = habit.schedules.map((v) =>
    v.effectiveFrom === habit.startDate ? { ...v, effectiveFrom: draft.startDate } : v,
  );
  if (!sameSchedule(currentSchedule({ ...habit, schedules }), schedule)) {
    const effectiveFrom = today < draft.startDate ? draft.startDate : today;
    schedules = [...schedules.filter((v) => v.effectiveFrom !== effectiveFrom), { ...schedule, effectiveFrom }];
  }
  return {
    ...habit,
    name: draft.name.trim(),
    category: draft.category,
    color: draft.color,
    reminder: draft.reminder,
    startDate: draft.startDate,
    why: draft.why.trim(),
    schedules,
    updatedAt: now,
  };
}

export function archiveHabit(habit: Habit, today: LocalDate, now: string): Habit {
  if (isArchived(habit)) return habit;
  return { ...habit, pauses: [...habit.pauses, { from: today, to: null }], updatedAt: now };
}

/** Closes the open pause. Archiving and restoring on the same day leaves no gap at all. */
export function restoreHabit(habit: Habit, today: LocalDate, now: string): Habit {
  const pauses = habit.pauses.flatMap((p) => {
    if (p.to !== null) return [p];
    return p.from >= today ? [] : [{ from: p.from, to: addDays(today, -1) }];
  });
  return { ...habit, pauses, updatedAt: now };
}

export function sortHabits(habits: Habit[]): Habit[] {
  return [...habits].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

/** Moves a habit one place up or down; returns the new id order. */
export function moveHabit(habits: Habit[], id: string, direction: -1 | 1): string[] {
  const ids = sortHabits(habits).map((h) => h.id);
  const i = ids.indexOf(id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  return ids;
}
