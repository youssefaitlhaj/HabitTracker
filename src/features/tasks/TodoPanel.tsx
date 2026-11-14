import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TASK_TITLE_MAX, tasksForToday } from '@/domain/tasks';
import type { Task } from '@/domain/types';
import { useTaskActions } from '@/state/actions';
import type { Ledger } from '@/state/ledger';
import { IconButton } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { TextInput } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { TaskRow } from './TaskRow';

/** Today's right column: quick add, overdue and today's tasks, and what was finished today. */
export function TodoPanel({ ledger, className }: { ledger: Ledger; className?: string }) {
  const { overdue, today, done } = tasksForToday(ledger.tasks, ledger.today);
  const actions = useTaskActions();
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const groups: { title: string; tone: string; tasks: Task[] }[] = [
    { title: 'Overdue', tone: 'text-error', tasks: overdue },
    { title: 'Today', tone: 'text-muted', tasks: today },
    { title: 'Done today', tone: 'text-muted', tasks: done },
  ];

  return (
    <section className={cx('card flex flex-col gap-3 p-4', className)} aria-labelledby="todo-h">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="todo-h" className="m-0 font-display text-[22px] font-semibold">
          To-do
        </h2>
        <Link to="/tasks" className="text-[13px] font-semibold no-underline">
          All tasks →
        </Link>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return toast.show('Type a task first.', { kind: 'error' });
          actions.add(draft, ledger.today);
          setDraft('');
        }}
      >
        <label htmlFor="todo-in" className="sr-only">
          Add a task for today
        </label>
        <TextInput id="todo-in" maxLength={TASK_TITLE_MAX} placeholder="Add a task for today" value={draft} onChange={(e) => setDraft(e.target.value)} className="!h-11" />
        <IconButton icon="plus" tone="primary" label="Add task" type="submit" />
      </form>
      {overdue.length + today.length + done.length === 0 ? (
        <p className="m-0 px-1 text-sm text-muted">Nothing due today. Tasks without a date wait in the Tasks section.</p>
      ) : (
        groups
          .filter((g) => g.tasks.length)
          .map((g) => (
            <div key={g.title} className="flex flex-col">
              <span className={cx('px-1 pb-1 pt-1 text-xs font-bold uppercase tracking-[0.08em]', g.tone)}>{g.title}</span>
              <ul className="m-0 flex list-none flex-col p-0">
                {g.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} today={ledger.today} compact />
                ))}
              </ul>
            </div>
          ))
      )}
    </section>
  );
}

/** Today's summary card: open tasks, overdue count and what's next. */
export function TasksSummaryCard({ ledger }: { ledger: Ledger }) {
  const { overdue, today } = tasksForToday(ledger.tasks, ledger.today);
  const next = today.find((t) => t.time) ?? today[0];
  const open = overdue.length + today.length;
  return (
    <section className="card flex min-w-0 flex-col justify-center gap-1.5 p-4 tablet:p-6" aria-label="Tasks today">
      <p className="eyebrow m-0">Tasks today</p>
      <p className="m-0 font-display text-[24px] tablet:text-[28px]">
        {open} open
        {overdue.length > 0 && <span className="ml-2 block font-sans text-xs font-semibold text-error tablet:inline tablet:text-sm">· {overdue.length} overdue</span>}
      </p>
      <p className="m-0 hidden truncate text-sm text-muted tablet:block">{next ? `Next: ${next.title}${next.time ? ` at ${next.time}` : ''}` : 'Nothing due today.'}</p>
    </section>
  );
}
