import type { Checkin, Habit, Note } from '../../domain/types';

/**
 * Firestore document shapes, shared by the app (firebaseBackend) and the reminder job
 * (scripts/send-reminders.ts). No Firebase SDK imports here, so both can use it.
 */

export type StoredNote = Omit<Note, 'habitId'>;

/** users/{uid}/habits/{habitId}: the habit plus its check-in dates and notes. */
export interface HabitDoc extends Habit {
  checkins?: string[];
  notes?: StoredNote[];
}

/** users/{uid}/devices/{deviceId}: one browser that receives reminders. */
export interface DeviceDoc {
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  userAgent: string;
  createdAt: string;
}

/** The habit fields only, so saving a habit never overwrites its check-ins or notes. */
export function habitFields(h: Habit): Habit {
  const { id, name, category, color, reminder, startDate, why, order, schedules, pauses, createdAt, updatedAt } = h;
  return { id, name, category, color, reminder, startDate, why, order, schedules, pauses, createdAt, updatedAt };
}

export const checkinsOf = (h: HabitDoc): Checkin[] => (h.checkins ?? []).map((date) => ({ habitId: h.id, date }));

export const notesOf = (h: HabitDoc): Note[] => (h.notes ?? []).map((n) => ({ ...n, habitId: h.id }));
