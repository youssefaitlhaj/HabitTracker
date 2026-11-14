import { useState } from 'react';
import { formatDate } from '@/domain/date';
import { isCarriedOver, TASK_TITLE_MAX, tasksForToday } from '@/domain/tasks';
import type { Task } from '@/domain/types';
import { useTaskActions } from '@/state/actions';
import type { Ledger } from '@/state/ledger';
import { IconButton } from '@/ui/Button';
import { CheckMark } from '@/ui/Choice';
import { cx } from '@/ui/cx';
import { SectionTitle } from '@/ui/Display';
import { TextInput } from '@/ui/Field';
import { useToast } from '@/ui/Toast';

/** Daily tasks on Today: one-off to-dos; unfinished ones carry over to the next day. */
export function TasksSection({ ledger }: { ledger: Ledger }) {
  const { open, done } = tasksForToday(ledger.tasks, ledger.today);
  const actions = useTaskActions();
  const toast = useToast();
  const [draft, setDraft] = useState('');

  return (
    <section className="flex flex-col gap-3" aria-labelledby="tasks-h">
      <SectionTitle id="tasks-h" aside={`${open.length} open · ${done.length} done`}>
        Daily tasks
      </SectionTitle>
      <div className="card flex flex-col p-2 tablet:p-3">
        <form
          className="flex gap-2 p-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return toast.show('Type a task first.', { kind: 'error' });
            actions.add(draft, ledger.today);
            setDraft('');
          }}
        >
          <label htmlFor="task-in" className="sr-only">
            Add a task for today
          </label>
          <TextInput id="task-in" maxLength={TASK_TITLE_MAX} placeholder="Add a task for today" value={draft} onChange={(e) => setDraft(e.target.value)} className="!h-11" />
          <IconButton icon="plus" tone="primary" label="Add task" type="submit" />
        </form>
        {open.length + done.length === 0 ? (
          <p className="m-0 px-2 pb-2 pt-1 text-sm text-muted">Nothing on your list. Add something you want to get done today; if it doesn’t happen, it moves to tomorrow.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {[...open, ...done].map((task) => (
              <TaskRow key={task.id} task={task} today={ledger.today} actions={actions} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function TaskRow({ task, today, actions }: { task: Task; today: string; actions: ReturnType<typeof useTaskActions> }) {
  const done = !!task.doneOn;
  return (
    <li className="flex items-center gap-3 border-t border-line-soft px-1 py-1.5 first:border-t-0">
      <button
        type="button"
        aria-pressed={done}
        aria-label={`${done ? 'Reopen' : 'Check off'} ${task.title}`}
        onClick={() => actions.setDone(task, !done, today)}
        className={cx(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
          done ? 'border-whisky bg-whisky text-on-accent' : 'border-control text-ink hover:border-whisky',
        )}
      >
        <CheckMark on={done} size={18} />
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cx('break-words text-[15px]', done && 'text-muted line-through')}>{task.title}</span>
        {isCarriedOver(task, today) && (
          <span className="text-xs font-semibold text-oak">From {formatDate(task.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        )}
      </div>
      <IconButton icon="trash" label={`Delete ${task.title}`} onClick={() => actions.remove(task)} />
    </li>
  );
}
