import { useState } from 'react';
import type { Habit, LocalDate } from '@/domain/types';
import { useHabitActions } from '@/state/actions';
import { ConfirmDialog } from '@/ui/Dialog';
import { useToast } from '@/ui/Toast';

/** Delete confirmation with "Archive instead", shared by the editor and the detail page. */
export function useDeleteHabit(onDone?: () => void) {
  const [target, setTarget] = useState<{ habit: Habit; today: LocalDate; checkins: number } | null>(null);
  const { remove, archive } = useHabitActions();
  const toast = useToast();

  const close = () => setTarget(null);
  const dialog = target && (
    <ConfirmDialog
      open
      onClose={close}
      title={`Delete “${target.habit.name}”?`}
      message={`This removes the habit, its ${target.checkins} check-ins and all notes. It can’t be undone. Archiving hides it but keeps your history.`}
      confirmLabel="Delete forever"
      onConfirm={() => {
        remove(target.habit.id);
        toast.show(`${target.habit.name} deleted.`, { kind: 'error' });
        close();
        onDone?.();
      }}
      alternative={{
        label: 'Archive instead',
        run: () => {
          archive(target.habit, target.today);
          close();
          onDone?.();
        },
      }}
    />
  );

  return { ask: (habit: Habit, today: LocalDate, checkins: number) => setTarget({ habit, today, checkins }), dialog };
}
