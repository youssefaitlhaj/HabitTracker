import type { LocalDate, Task } from '@/domain/types';
import { useTaskActions } from '@/state/actions';
import { IconButton } from '@/ui/Button';
import { CheckMark } from '@/ui/Choice';
import { cx } from '@/ui/cx';
import { Icon } from '@/ui/Icon';
import { useTaskDialogs } from './TaskDialogs';
import { SeverityChip, WhenLabel } from './taskStyle';

interface TaskRowProps {
  task: Task;
  today: LocalDate;
  /** Today's To-do column: details button only, and no "Today" in the date. */
  compact?: boolean;
}

/** One task: check off, name, when, severity, and details / edit / delete. */
export function TaskRow({ task, today, compact }: TaskRowProps) {
  const actions = useTaskActions();
  const dialogs = useTaskDialogs();
  const done = !!task.doneOn;
  return (
    <li className="flex items-center gap-2 border-t border-line-soft py-1 first:border-t-0">
      <button
        type="button"
        aria-pressed={done}
        aria-label={`${done ? 'Reopen' : 'Check off'} ${task.title}`}
        onClick={() => actions.setDone(task, !done, today)}
        className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
      >
        <span
          className={cx(
            'flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] transition-colors',
            done ? 'border-whisky bg-whisky text-on-accent' : 'border-control group-hover:border-whisky',
          )}
        >
          <CheckMark on={done} size={12} />
        </span>
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-1">
        <span className={cx('break-words text-[15px]', done && 'text-muted line-through')}>{task.title}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <WhenLabel task={task} today={today} omitToday={compact} />
          <SeverityChip severity={task.severity} />
          {task.notes && (
            <span className="text-muted" title="Has notes">
              <Icon name="note" size={14} />
              <span className="sr-only">Has notes</span>
            </span>
          )}
        </span>
      </div>
      <IconButton icon="eye" label={`Details of ${task.title}`} onClick={() => dialogs.show(task)} />
      {!compact && (
        <>
          <IconButton icon="edit" label={`Edit ${task.title}`} onClick={() => dialogs.edit(task)} />
          <IconButton icon="trash" label={`Delete ${task.title}`} onClick={() => actions.remove(task)} />
        </>
      )}
    </li>
  );
}
