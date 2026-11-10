import { Link } from 'react-router-dom';
import { addDays, formatDate, formatLong } from '@/domain/date';
import type { DayStatus } from '@/domain/stats';
import type { Habit, LocalDate } from '@/domain/types';
import type { Ledger } from '@/state/ledger';
import { useCheckinToggle } from '@/state/actions';
import { CheckMark } from '@/ui/Choice';
import { cx } from '@/ui/cx';
import { HABIT_COLOR_HEX, streakLabel } from './habitStyle';

/** One habit with its check-off button. Compact row on phones, card from tablet up (design §8.9). */

const DOT_STYLE: Partial<Record<DayStatus, string>> = {
  done: 'bg-whisky border-whisky',
  rest: 'bg-[repeating-linear-gradient(135deg,#E9CBA2_0_2px,#F4EEE2_2px_4px)] border-[#E9CBA2]',
  missed: 'bg-transparent border-[#B9A88F]',
  pending: 'bg-transparent border-ink',
};

export function HabitInitial({ habit, size = 44 }: { habit: Habit; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-[12px] font-display font-semibold text-surface"
      style={{ width: size, height: size, background: HABIT_COLOR_HEX[habit.color], fontSize: size * 0.42 }}
    >
      {habit.name.charAt(0).toUpperCase()}
    </span>
  );
}

interface HabitCardProps {
  habit: Habit;
  ledger: Ledger;
  date: LocalDate;
  detail: string;
}

export function HabitCard({ habit, ledger, date, detail }: HabitCardProps) {
  const toggle = useCheckinToggle();
  const { stats, today, profile } = ledger;
  const done = stats.isDone(habit.id, date);
  const streak = stats.currentStreak(habit);
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <article
      className={cx(
        'flex items-center gap-3 rounded-[18px] border p-2.5 pr-3.5 transition-colors',
        'tablet:grid tablet:grid-cols-[1fr_auto] tablet:gap-x-3 tablet:gap-y-4 tablet:p-5',
        done ? 'border-[#E2C39C] bg-[#F7ECDC]' : 'border-line bg-surface',
      )}
    >
      <button
        type="button"
        aria-pressed={done}
        aria-label={`${done ? 'Uncheck' : 'Check off'} ${habit.name}${date === today ? '' : `, ${formatLong(date)}`}`}
        onClick={() => toggle(habit, date, !done, today)}
        className={cx(
          'flex h-12 w-12 shrink-0 items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] font-semibold transition-colors',
          'tablet:col-start-2 tablet:row-start-2 tablet:h-11 tablet:w-auto tablet:rounded-field tablet:px-4 tablet:text-sm',
          done ? 'border-whisky bg-whisky text-surface' : 'border-[#B9A88F] bg-transparent text-ink hover:border-whisky',
        )}
      >
        <span className="tablet:hidden">
          <CheckMark on={done} size={20} />
        </span>
        <span className="hidden items-center gap-1.5 tablet:flex">
          <CheckMark on size={16} />
          {done ? 'Done' : 'Mark done'}
        </span>
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3.5 tablet:col-span-2 tablet:row-start-1">
        <span className="hidden tablet:block">
          <HabitInitial habit={habit} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link to={`/habits/${habit.id}`} className="truncate text-[15px] font-semibold text-ink no-underline hover:underline tablet:text-base">
            {habit.name}
          </Link>
          <span className="truncate text-[13px] text-muted">{detail}</span>
        </div>
        {profile.showStreaks && (
          <span className={cx('shrink-0 text-[13px] font-semibold', done ? 'text-oak' : 'text-muted')}>
            {streakLabel(streak.value, streak.unit)}
          </span>
        )}
      </div>

      <div className="hidden gap-1.5 tablet:col-start-1 tablet:row-start-2 tablet:flex" role="img" aria-label={`Last 7 days of ${habit.name}`}>
        {last7.map((d) => {
          const status = stats.dayStatus(habit, d);
          return (
            <span key={d} className="flex flex-col items-center gap-1" title={`${formatLong(d)}: ${status}`}>
              <span className="text-[10px] text-muted">{formatDate(d, { weekday: 'narrow' })}</span>
              <span className={cx('h-3 w-3 rounded-full border-[1.5px]', DOT_STYLE[status] ?? 'border-line bg-oat')} />
            </span>
          );
        })}
      </div>
    </article>
  );
}
