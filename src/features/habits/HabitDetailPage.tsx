import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addDays, addMonths, eachDay, endOfMonth, endOfWeek, formatDate, formatLong, startOfMonth, startOfWeek, weekRows } from '@/domain/date';
import type { DayStatus } from '@/domain/stats';
import { currentSchedule, isArchived } from '@/domain/schedule';
import type { Habit } from '@/domain/types';
import { useCheckinToggle, useHabitActions, useNoteActions } from '@/state/actions';
import { LedgerView } from '@/app/shell/LedgerView';
import type { Ledger } from '@/state/ledger';
import { Banner } from '@/ui/Banner';
import { Button, IconButton } from '@/ui/Button';
import { CalendarGrid } from '@/ui/CalendarGrid';
import { cx } from '@/ui/cx';
import { EmptyState, StatTile } from '@/ui/Display';
import { TextInput } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { useToast } from '@/ui/Toast';
import { useDeleteHabit } from './DeleteHabit';
import { HabitInitial } from './HabitCard';
import { useHabitEditor } from './HabitEditor';
import { CATEGORY_LABEL, describeRest, describeSchedule } from './habitStyle';

export function HabitDetailPage() {
  const { id } = useParams();
  return (
    <LedgerView>
      {(ledger) => {
        const habit = ledger.habits.find((h) => h.id === id);
        return habit ? (
          <HabitDetail habit={habit} ledger={ledger} />
        ) : (
          <EmptyState icon="list" title="Habit not found" action={<Link to="/habits">Back to all habits</Link>}>
            It may have been deleted.
          </EmptyState>
        );
      }}
    </LedgerView>
  );
}

function HabitDetail({ habit, ledger }: { habit: Habit; ledger: Ledger }) {
  const { stats, today } = ledger;
  const editor = useHabitEditor();
  const navigate = useNavigate();
  const { archive, restore } = useHabitActions();
  const deletion = useDeleteHabit(() => navigate('/habits'));
  const [bannerHidden, setBannerHidden] = useState(false);

  const schedule = currentSchedule(habit);
  const streak = stats.currentStreak(habit);
  const best = stats.bestStreak(habit);
  const last30 = stats.habitCompletion(habit, addDays(today, -29), today);
  const total = stats.totalCheckins(habit);
  const restThisWeek = eachDay(startOfWeek(today, ledger.profile.weekStart), today).find((d) => stats.dayStatus(habit, d) === 'rest');
  const archived = isArchived(habit);
  const chips = [CATEGORY_LABEL[habit.category], describeSchedule(schedule), describeRest(schedule), habit.reminder && `Reminder ${habit.reminder}`].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <Link to="/habits" className="flex min-h-11 items-center gap-1.5 self-start font-semibold no-underline">
        <Icon name="chevronLeft" size={16} strokeWidth={2.5} />
        All habits
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <HabitInitial habit={habit} size={64} />
          <div className="flex min-w-0 flex-col gap-2.5">
            <h1 className="m-0 font-display text-[clamp(30px,5vw,44px)] font-normal leading-tight tracking-tight">{habit.name}</h1>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c, i) => (
                <span key={String(c)} className={cx('rounded-full px-2.5 py-1 text-[13px]', i === 0 ? 'bg-oat-deep font-semibold text-oak' : 'border border-line bg-surface')}>
                  {c}
                </span>
              ))}
              {archived && <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[13px] font-semibold text-warning-ink">Archived</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon="edit" onClick={() => editor.open(habit)}>
            Edit
          </Button>
          {archived ? (
            <Button size="sm" variant="secondary" icon="restore" onClick={() => restore(habit, today)}>
              Restore
            </Button>
          ) : (
            <Button size="sm" variant="secondary" icon="archive" onClick={() => archive(habit, today)}>
              Archive
            </Button>
          )}
          <Button size="sm" variant="danger-outline" icon="trash" onClick={() => deletion.ask(habit, today, total)}>
            Delete
          </Button>
        </div>
      </header>

      {restThisWeek && !bannerHidden && (
        <Banner title="Your streak is safe" onDismiss={() => setBannerHidden(true)}>
          You used a rest day on {formatDate(restThisWeek, { weekday: 'long', day: 'numeric', month: 'short' })}. A new allowance starts next week.
        </Banner>
      )}

      <div className="grid grid-cols-2 gap-3 desktop:grid-cols-4">
        <StatTile tone="dark" label="Current streak" value={streak.value} unit={streak.unit} accent />
        <StatTile label="Best streak" value={best.value} unit={best.unit} />
        <StatTile label="Last 30 days" value={last30 === null ? '–' : `${Math.round(last30 * 100)}%`} accent />
        <StatTile label="Total check-ins" value={total} />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <HabitCalendar habit={habit} ledger={ledger} />
        <NotesPanel habit={habit} ledger={ledger} />
      </div>
      {deletion.dialog}
    </div>
  );
}

const STATUS_STYLE: Record<DayStatus, { cell: string; tag: string }> = {
  done: { cell: 'bg-whisky border-whisky text-on-accent', tag: 'Done' },
  missed: { cell: 'bg-error-soft border-error-line text-error-ink', tag: 'Missed' },
  rest: { cell: 'rest-pattern text-ink', tag: 'Rest' },
  pending: { cell: 'bg-surface border-cask text-ink', tag: 'Today' },
  open: { cell: 'bg-surface border-line text-ink', tag: '' },
  unscheduled: { cell: 'bg-oat border-oat text-muted', tag: '' },
  future: { cell: 'bg-transparent border-dashed border-line-strong text-muted', tag: '' },
  inactive: { cell: 'bg-transparent border-transparent text-muted', tag: '' },
};

const TOGGLEABLE: DayStatus[] = ['done', 'missed', 'rest', 'pending', 'open'];

function HabitCalendar({ habit, ledger }: { habit: Habit; ledger: Ledger }) {
  const { stats, today, profile } = ledger;
  const [month, setMonth] = useState(startOfMonth(today));
  const toggle = useCheckinToggle();
  const monthEnd = endOfMonth(month);
  const atLatest = month >= startOfMonth(today);

  return (
    <section className="card flex min-w-0 flex-[999_1_520px] flex-col gap-4 p-5 tablet:p-6" aria-labelledby="cal-h">
      <div className="flex items-center justify-between gap-3">
        <h2 id="cal-h" className="m-0 font-display text-[22px] font-semibold" aria-live="polite">
          {formatDate(month, { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-1">
          <IconButton icon="chevronLeft" tone="oat" label="Previous month" disabled={month <= startOfMonth(habit.startDate)} onClick={() => setMonth(addMonths(month, -1))} />
          <IconButton icon="chevronRight" tone="oat" label="Next month" disabled={atLatest} onClick={() => setMonth(addMonths(month, 1))} />
        </div>
      </div>
      <CalendarGrid
        rows={weekRows(startOfWeek(month, profile.weekStart), endOfWeek(monthEnd, profile.weekStart), profile.weekStart)}
        weekStart={profile.weekStart}
        renderDay={(d) => {
          const inMonth = d >= month && d <= monthEnd;
          const status = stats.dayStatus(habit, d);
          const style = STATUS_STYLE[status];
          const canToggle = inMonth && TOGGLEABLE.includes(status);
          const done = status === 'done';
          return (
            <button
              type="button"
              disabled={!canToggle}
              aria-pressed={canToggle ? done : undefined}
              aria-label={`${formatLong(d)}: ${style.tag || status}`}
              onClick={() => toggle(habit, d, !done, today)}
              className={cx(
                'flex h-14 flex-col items-start justify-between rounded-[12px] border-[1.5px] px-2 py-1.5 text-left',
                style.cell,
                !inMonth && 'invisible',
                canToggle ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <span className="text-[13px] font-semibold">{Number(d.slice(8))}</span>
              <span className="hidden text-[11px] font-medium tablet:block">{style.tag}</span>
            </button>
          );
        }}
      />
      <div className="flex flex-wrap gap-4 text-[13px] text-muted">
        {(['done', 'missed', 'rest', 'unscheduled'] as DayStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cx('h-3.5 w-3.5 rounded border-[1.5px]', STATUS_STYLE[s].cell)} />
            {STATUS_STYLE[s].tag || 'Not scheduled'}
          </span>
        ))}
      </div>
    </section>
  );
}

function NotesPanel({ habit, ledger }: { habit: Habit; ledger: Ledger }) {
  const [draft, setDraft] = useState('');
  const notes = useNoteActions();
  const toast = useToast();
  const list = ledger.notes.filter((n) => n.habitId === habit.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  return (
    <section className="card flex flex-[1_1_300px] flex-col gap-4 p-5 tablet:p-6" aria-labelledby="notes-h">
      <h2 id="notes-h" className="m-0 font-display text-[22px] font-semibold">
        Notes
      </h2>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) {
            toast.show('Write something first.', { kind: 'error' });
            return;
          }
          notes.add(habit.id, ledger.today, draft);
          setDraft('');
          toast.show('Note added to today.', { kind: 'success' });
        }}
      >
        <label htmlFor="note-in" className="sr-only">
          Add a note
        </label>
        <TextInput id="note-in" maxLength={500} placeholder="How did it go today?" value={draft} onChange={(e) => setDraft(e.target.value)} className="!h-11" />
        <IconButton icon="plus" tone="primary" label="Add note" type="submit" />
      </form>
      {list.length === 0 ? (
        <p className="m-0 text-sm text-muted">No notes yet. A line now and then makes the history worth reading.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {list.map((n) => (
            <li key={n.id} className="flex items-start gap-2 border-t border-line-soft py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs font-semibold text-muted">{formatDate(n.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="break-words text-[15px] leading-normal">{n.text}</span>
              </div>
              <IconButton
                icon="trash"
                label="Delete note"
                onClick={() => {
                  notes.remove(n.id);
                  toast.show('Note deleted.', { action: { label: 'Undo', run: () => notes.add(n.habitId, n.date, n.text) } });
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
