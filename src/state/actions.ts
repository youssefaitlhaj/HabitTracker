import { useCallback } from 'react';
import { newId, nowIso } from '@/data/defaults';
import type { ProfilePatch } from '@/data/ports';
import { formatShort } from '@/domain/date';
import { archiveHabit, restoreHabit, sortHabits } from '@/domain/habits';
import type { Checkin, Habit, LocalDate, Note } from '@/domain/types';
import { useToast } from '@/ui/Toast';
import { useOptimistic } from './mutations';

/** Write side, one hook per concern. Every write goes through useOptimistic. */

export function useHabitActions() {
  const toast = useToast();
  const save = useOptimistic({
    part: 'habits',
    apply: (list, habit: Habit) => sortHabits([...list.filter((h) => h.id !== habit.id), habit]),
    run: (r, habit) => r.habits.save(habit),
    errorMessage: 'Could not save the habit.',
  });
  const remove = useOptimistic({
    part: 'habits',
    apply: (list, id: string) => list.filter((h) => h.id !== id),
    run: (r, id) => r.habits.remove(id),
    errorMessage: 'Could not delete the habit.',
  });
  const reorder = useOptimistic({
    part: 'habits',
    apply: (list, ids: string[]) => sortHabits(list.map((h) => ({ ...h, order: ids.indexOf(h.id) }))),
    run: (r, ids) => r.habits.reorder(ids),
    errorMessage: 'Could not change the order.',
  });

  const archive = useCallback(
    (habit: Habit, today: LocalDate) => {
      save.mutate(archiveHabit(habit, today, nowIso()));
      toast.show(`${habit.name} archived. Find it under All habits.`, {
        action: { label: 'Undo', run: () => save.mutate(habit) },
      });
    },
    [save, toast],
  );

  const restore = useCallback(
    (habit: Habit, today: LocalDate) => {
      save.mutate(restoreHabit(habit, today, nowIso()));
      toast.show(`${habit.name} is back on Today.`, { kind: 'success' });
    },
    [save, toast],
  );

  return { save: save.mutate, remove: remove.mutate, reorder: reorder.mutate, archive, restore };
}

const sameCheckin = (a: Checkin, b: Checkin) => a.habitId === b.habitId && a.date === b.date;

export function useCheckinToggle() {
  const toast = useToast();
  const set = useOptimistic({
    part: 'checkins',
    apply: (list, { checkin, done }: { checkin: Checkin; done: boolean }) => [
      ...list.filter((c) => !sameCheckin(c, checkin)),
      ...(done ? [checkin] : []),
    ],
    run: (r, { checkin, done }) => r.checkins.set(checkin, done),
    errorMessage: 'Could not save that check-off.',
  });

  return useCallback(
    (habit: Habit, date: LocalDate, done: boolean, today: LocalDate) => {
      const checkin = { habitId: habit.id, date };
      set.mutate({ checkin, done });
      const when = date === today ? '' : ` for ${formatShort(date)}`;
      toast.show(done ? `${habit.name} done${when}.` : `${habit.name} unchecked${when}.`, {
        kind: done ? 'success' : 'info',
        action: { label: 'Undo', run: () => set.mutate({ checkin, done: !done }) },
      });
    },
    [set, toast],
  );
}

export function useNoteActions() {
  const add = useOptimistic({
    part: 'notes',
    apply: (list, note: Note) => [...list, note],
    run: (r, note) => r.notes.add(note),
    errorMessage: 'Could not save the note.',
  });
  const remove = useOptimistic({
    part: 'notes',
    apply: (list, id: string) => list.filter((n) => n.id !== id),
    run: (r, id) => r.notes.remove(id),
    errorMessage: 'Could not delete the note.',
  });
  return {
    add: (habitId: string, date: LocalDate, text: string) =>
      add.mutate({ id: newId(), habitId, date, text: text.trim(), createdAt: nowIso() }),
    remove: remove.mutate,
  };
}

export function useProfileUpdate() {
  const update = useOptimistic({
    part: 'profile',
    apply: (profile, patch: ProfilePatch) => ({ ...profile, ...patch, onboarded: patch.onboarded ?? profile.onboarded }),
    run: (r, patch) => r.profiles.update(patch),
    errorMessage: 'Could not save your settings.',
  });
  return update;
}
