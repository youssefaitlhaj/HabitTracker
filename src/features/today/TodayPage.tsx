import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, endOfWeek, formatDate, formatWeekday, startOfWeek, weekRows } from '@/domain/date';
import { currentSchedule, isArchived, versionOn } from '@/domain/schedule';
import type { Habit, LocalDate } from '@/domain/types';
import { HabitCard } from '@/features/habits/HabitCard';
import { NewHabitButton, useHabitEditor } from '@/features/habits/HabitEditor';
import { describeRest, describeSchedule } from '@/features/habits/habitStyle';
import { ProgressPanel } from '@/features/progress/ProgressPanel';
import { resolveRange, useRangeChoice } from '@/features/progress/range';
import { LedgerView } from '@/app/shell/LedgerView';
import type { Ledger } from '@/state/ledger';
import { Button } from '@/ui/Button';
import { CalendarGrid } from '@/ui/CalendarGrid';
import { cx } from '@/ui/cx';
import { Bars, EmptyState, PageHeader, ProgressRing, SectionTitle } from '@/ui/Display';
import { Icon } from '@/ui/Icon';
import { tokenColor } from '@/ui/theme';
import { useToast } from '@/ui/Toast';
import { groupHabits } from './groups';
import { TasksSection } from './TasksSection';

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';
}

export function TodayPage() {
  return <LedgerView>{(ledger) => <TodayView ledger={ledger} />}</LedgerView>;
}

function TodayView({ ledger }: { ledger: Ledger }) {
  const { today, stats, habits, profile } = ledger;
  const [date, setDate] = useState<LocalDate>(today);
  const [choice, setChoice] = useRangeChoice(today);
  const editor = useHabitEditor();
  const celebrating = useCelebration(ledger);

  const groups = groupHabits(habits, stats, date);
  const summary = stats.daySummary(today);
  const left = summary.scheduled - summary.done;
  const hasHabits = habits.some((h) => !isArchived(h));

  return (
    <div className="flex flex-col gap-7">
      <PageHeader eyebrow={formatWeekday(today)} title={greeting()} actions={<NewHabitButton className="hidden tablet:inline-flex" />} />

      <div className="flex flex-wrap gap-4">
        <section className="card flex flex-[1_1_300px] items-center gap-5 p-5 tablet:p-6" aria-label="Today's progress">
          <ProgressRing ratio={summary.scheduled ? summary.ratio : 0} size={124} stroke={13} track={tokenColor('heat-0')} color={tokenColor('whisky')} celebrate={celebrating}>
            <span className="font-display text-[32px] leading-none">{Math.round(summary.ratio * 100)}%</span>
            <span className="mt-1 text-xs text-muted">done</span>
          </ProgressRing>
          <div className="flex flex-col gap-1.5">
            <p className="eyebrow m-0">Today</p>
            <p className="m-0 font-display text-[28px]">
              {summary.done} of {summary.scheduled}
            </p>
            <p className="m-0 text-sm text-muted">
              {summary.scheduled === 0 ? 'Nothing scheduled today.' : left === 0 ? 'Every habit done today.' : `${left} ${left === 1 ? 'habit' : 'habits'} left for today`}
            </p>
          </div>
        </section>

        <section className="flex flex-[1_1_220px] flex-col justify-between gap-3.5 rounded-card bg-cask p-5 text-on-cask tablet:p-6" aria-label="Perfect-day streak">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-on-cask-muted">Perfect-day streak</p>
          <p className="m-0 font-display text-[44px] leading-none tablet:text-[60px]">
            {stats.perfectDayStreak()}
            <span className="ml-2 text-xl text-amber">days</span>
          </p>
          <p className="m-0 text-sm text-cask-soft">Finish every habit today to keep it going</p>
        </section>

        <section className="card hidden flex-[1_1_280px] flex-col gap-3.5 p-5 tablet:flex tablet:p-6" aria-label="Last 7 days">
          <p className="eyebrow m-0">Last 7 days</p>
          <Bars
            data={Array.from({ length: 7 }, (_, i) => {
              const d = addDays(today, i - 6);
              const s = stats.daySummary(d);
              return { key: d, label: formatDate(d, { weekday: 'narrow' }), value: s.done, max: Math.max(1, s.scheduled), highlight: d === today };
            })}
          />
        </section>
      </div>

      <WeekStrip ledger={ledger} date={date} onPick={setDate} />

      {!hasHabits ? (
        <EmptyState icon="calendar" title="No habits yet" action={<Button icon="plus" onClick={() => editor.open()}>Add your first habit</Button>}>
          Start with one small thing you can do every day.
        </EmptyState>
      ) : (
        <>
          <HabitGroup
            title={date === today ? 'Your habits' : `Habits on ${formatWeekday(date)}`}
            aside={`${groups.due.filter((h) => stats.isDone(h.id, date)).length} done · ${groups.due.filter((h) => !stats.isDone(h.id, date)).length} to go`}
            habits={groups.due}
            ledger={ledger}
            date={date}
            detail={(h) => [describeSchedule(versionOn(h, date) ?? currentSchedule(h)), describeRest(currentSchedule(h))].filter(Boolean).join(' · ')}
          />
          <HabitGroup
            title="This week"
            habits={groups.weekly}
            ledger={ledger}
            date={date}
            detail={(h) => {
              const p = stats.weekProgress(h, date);
              return p ? `${p.done} of ${p.target} this week${p.done >= p.target ? ' · target met' : ''}` : '';
            }}
          />
          {groups.notToday.length > 0 && (
            <details className="group rounded-card border border-line bg-surface px-5">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-semibold">
                Not today ({groups.notToday.length})
                <Icon name="chevronDown" className="transition-transform group-open:rotate-180" />
              </summary>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 pb-4">
                {groups.notToday.map((h) => (
                  <li key={h.id} className="flex justify-between gap-3 text-sm">
                    <Link to={`/habits/${h.id}`}>{h.name}</Link>
                    <span className="text-muted">{describeSchedule(currentSchedule(h))}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {date === today && <TasksSection ledger={ledger} />}

      <div className="hidden tablet:block">
        <ProgressPanel ledger={ledger} range={resolveRange(choice, today, profile.weekStart)} onChange={setChoice} />
      </div>
    </div>
  );
}

interface HabitGroupProps {
  title: string;
  aside?: string;
  habits: Habit[];
  ledger: Ledger;
  date: LocalDate;
  detail: (habit: Habit) => string;
}

function HabitGroup({ title, aside, habits, ledger, date, detail }: HabitGroupProps) {
  if (!habits.length) return null;
  const id = `group-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <section className="flex flex-col gap-3" aria-labelledby={id}>
      <SectionTitle id={id} aside={aside}>
        {title}
      </SectionTitle>
      <div className="grid gap-2.5 tablet:grid-cols-2 tablet:gap-4 desktop:grid-cols-3">
        {habits.map((h) => (
          <HabitCard key={h.id} habit={h} ledger={ledger} date={date} detail={detail(h)} />
        ))}
      </div>
    </section>
  );
}

/** Phone week strip: pick a past day of this week to fix check-offs (design: PhoneToday). */
function WeekStrip({ ledger, date, onPick }: { ledger: Ledger; date: LocalDate; onPick: (d: LocalDate) => void }) {
  const { today, stats, profile } = ledger;
  const toast = useToast();
  const weekStart = startOfWeek(today, profile.weekStart);
  return (
    <div className="tablet:hidden" role="group" aria-label="This week">
      <CalendarGrid
        rows={weekRows(weekStart, endOfWeek(today, profile.weekStart), profile.weekStart)}
        weekStart={profile.weekStart}
        labels={false}
        renderDay={(d) => {
          const on = d === date;
          const s = stats.daySummary(d);
          return (
            <button
              type="button"
              aria-pressed={on}
              aria-label={formatWeekday(d) + (d === today ? ', today' : '')}
              onClick={() => (d > today ? toast.show('You can only check off today and past days.') : onPick(d))}
              className={cx(
                'flex h-16 flex-col items-center justify-center gap-0.5 rounded-[14px] border-[1.5px]',
                on ? 'border-whisky bg-whisky text-on-accent' : d === today ? 'border-whisky bg-surface' : 'border-line bg-surface',
                d > today && 'text-muted',
              )}
            >
              <span className="text-[11px] font-semibold">{formatDate(d, { weekday: 'short' })}</span>
              <span className="text-base font-bold">{Number(d.slice(8))}</span>
              <span className={cx('h-1.5 w-1.5 rounded-full', s.done > 0 ? (on ? 'bg-on-accent' : 'bg-whisky') : 'bg-transparent')} />
            </button>
          );
        }}
      />
    </div>
  );
}

/**
 * Celebrates the moment today becomes a perfect day (design §8.5) with a short ring glow.
 * A toast would replace the check-off toast and take its Undo away, so none is shown.
 */
function useCelebration({ stats, today, profile }: Ledger): boolean {
  const perfect = stats.daySummary(today).perfect;
  const previous = useRef(perfect);
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    const started = perfect && !previous.current && profile.celebrate;
    previous.current = perfect;
    if (!started) return;
    setCelebrating(true);
    const timer = window.setTimeout(() => setCelebrating(false), 2400);
    return () => window.clearTimeout(timer);
  }, [perfect, profile.celebrate]);
  return celebrating;
}
