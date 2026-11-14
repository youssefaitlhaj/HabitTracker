import { useState } from 'react';
import { formatDate } from '@/domain/date';
import { groupTasks, TASK_FILTERS, taskStats, type TaskFilter, type TaskGroup } from '@/domain/tasks';
import { SEVERITIES } from '@/domain/types';
import { LedgerView } from '@/app/shell/LedgerView';
import type { Ledger } from '@/state/ledger';
import { Button } from '@/ui/Button';
import { Segmented } from '@/ui/Choice';
import { cx } from '@/ui/cx';
import { Bars, EmptyState, PageHeader, StatTile } from '@/ui/Display';
import { TextInput } from '@/ui/Field';
import { useTaskDialogs } from './TaskDialogs';
import { TaskRow } from './TaskRow';
import { SEVERITY_META } from './taskStyle';

/** The Tasks section (design: TasksPage.dc.html): statistics, filters, search and the grouped list. */

const FILTER_LABEL: Record<TaskFilter, string> = { all: 'All', today: 'Today', upcoming: 'Upcoming', overdue: 'Overdue', undated: 'No date', done: 'Done' };
const GROUP_TITLE: Record<TaskGroup['key'], { title: string; tone: string }> = {
  overdue: { title: 'Overdue', tone: 'text-error' },
  today: { title: 'Today', tone: 'text-muted' },
  upcoming: { title: 'Upcoming', tone: 'text-muted' },
  undated: { title: 'No date', tone: 'text-muted' },
  done: { title: 'Done', tone: 'text-muted' },
};

export function TasksPage() {
  return <LedgerView>{(ledger) => <TasksView ledger={ledger} />}</LedgerView>;
}

function TasksView({ ledger }: { ledger: Ledger }) {
  const dialogs = useTaskDialogs();
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [query, setQuery] = useState('');
  const stats = taskStats(ledger.tasks, ledger.today, ledger.profile.weekStart);
  const groups = groupTasks(ledger.tasks, ledger.today, filter, query);
  const weekDelta = stats.doneThisWeek - stats.doneLastWeek;
  const maxSeverity = Math.max(1, stats.open);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Tasks" actions={<Button icon="plus" onClick={() => dialogs.edit()}>New task</Button>} />

      <div className="grid grid-cols-2 gap-3 desktop:grid-cols-4">
        <StatTile tone="dark" label="Open" value={stats.open} unit={stats.undated ? `· ${stats.undated} no date` : undefined} />
        <StatTile label="Overdue" value={stats.overdue} accent={stats.overdue > 0} />
        <StatTile label="Done this week" value={stats.doneThisWeek} unit={weekDelta === 0 ? undefined : `${weekDelta > 0 ? '+' : ''}${weekDelta} vs last`} />
        <StatTile label="Done on time" value={stats.onTimeRate === null ? '–' : `${Math.round(stats.onTimeRate * 100)}%`} unit="30 days" />
      </div>

      <div className="flex flex-wrap gap-4">
        <section className="card flex flex-[3_1_380px] flex-col gap-3 p-5" aria-label="Done per week">
          <span className="text-[13px] font-semibold text-muted">Done per week · last 8 weeks</span>
          <Bars
            height={120}
            data={stats.perWeek.map((w, i) => ({
              key: w.weekStart,
              label: formatDate(w.weekStart, { day: 'numeric', month: 'short' }),
              value: w.count,
              max: Math.max(1, ...stats.perWeek.map((x) => x.count)),
              highlight: i === stats.perWeek.length - 1,
            }))}
          />
        </section>
        <section className="card flex flex-[2_1_260px] flex-col gap-3 p-5" aria-label="Open tasks by severity">
          <span className="text-[13px] font-semibold text-muted">Open tasks by severity</span>
          {[...SEVERITIES.slice().reverse(), 'none' as const].map((s) => {
            const n = stats.openBySeverity[s];
            return (
              <div key={s} className="flex items-center gap-2.5 text-[13px]">
                <span className="w-16">{s === 'none' ? 'None' : SEVERITY_META[s].label}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-oat">
                  <span className={cx('block h-full rounded-full', s === 'none' ? 'bg-line-strong' : SEVERITY_META[s].bar)} style={{ width: `${(n / maxSeverity) * 100}%` }} />
                </span>
                <span className="w-6 text-right font-semibold">{n}</span>
              </div>
            );
          })}
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<TaskFilter> label="Show" options={TASK_FILTERS.map((f) => ({ value: f, label: FILTER_LABEL[f] }))} value={filter} onChange={setFilter} />
        <div className="w-full tablet:w-64">
          <label htmlFor="task-search" className="sr-only">
            Search tasks
          </label>
          <TextInput id="task-search" type="search" placeholder="Search tasks" value={query} onChange={(e) => setQuery(e.target.value)} className="!h-11" />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon="tasks" title={query ? 'No tasks match your search' : 'Nothing here'} action={!query && <Button icon="plus" onClick={() => dialogs.edit()}>New task</Button>}>
          {query ? 'Try another word.' : 'Tasks you add show up here, with or without a date.'}
        </EmptyState>
      ) : (
        <section className="card flex flex-col px-3 py-1 tablet:px-4" aria-label="Task list">
          {groups.map((g) => (
            <div key={g.key} className="flex flex-col">
              <h2 className={cx('m-0 px-1 pb-1 pt-3 text-xs font-bold uppercase tracking-[0.08em]', GROUP_TITLE[g.key].tone)}>
                {GROUP_TITLE[g.key].title} · {g.tasks.length}
              </h2>
              <ul className="m-0 flex list-none flex-col p-0">
                {g.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} today={ledger.today} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
