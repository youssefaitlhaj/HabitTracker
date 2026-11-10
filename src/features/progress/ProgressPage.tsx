import { Link } from 'react-router-dom';
import { isArchived } from '@/domain/schedule';
import { HabitInitial } from '@/features/habits/HabitCard';
import { useLedger, type Ledger } from '@/state/ledger';
import { LoadingScreen, PageHeader, SectionTitle } from '@/ui/Display';
import { ProgressPanel } from './ProgressPanel';
import { resolveRange, useRangeChoice, type ResolvedRange } from './range';

export function ProgressPage() {
  const { ledger } = useLedger();
  if (!ledger) return <LoadingScreen />;
  return <ProgressView ledger={ledger} />;
}

function ProgressView({ ledger }: { ledger: Ledger }) {
  const [choice, setChoice] = useRangeChoice(ledger.today);
  const range = resolveRange(choice, ledger.today, ledger.profile.weekStart);
  return (
    <div className="flex flex-col gap-7">
      <PageHeader title="Progress" />
      <ProgressPanel ledger={ledger} range={range} onChange={setChoice} titleId="progress-page-h" title="Overview" />
      <HabitBreakdown ledger={ledger} range={range} />
    </div>
  );
}

function HabitBreakdown({ ledger, range }: { ledger: Ledger; range: ResolvedRange }) {
  const { stats } = ledger;
  const rows = ledger.habits.filter((h) => !isArchived(h) || ledger.checkins.some((c) => c.habitId === h.id && c.date >= range.from && c.date <= range.until));
  if (!rows.length) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="breakdown-h">
      <SectionTitle id="breakdown-h" aside={range.label}>
        By habit
      </SectionTitle>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr className="text-[13px] text-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Habit</th>
              <th scope="col" className="px-4 py-3 font-semibold">Completion</th>
              <th scope="col" className="px-4 py-3 font-semibold">Check-ins</th>
              <th scope="col" className="px-4 py-3 font-semibold">Current streak</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => {
              const completion = stats.habitCompletion(h, range.from, range.until);
              const checks = ledger.checkins.filter((c) => c.habitId === h.id && c.date >= range.from && c.date <= range.until).length;
              const streak = stats.currentStreak(h);
              const pct = completion === null ? null : Math.round(completion * 100);
              return (
                <tr key={h.id} className="border-t border-line-soft">
                  <th scope="row" className="px-4 py-3 font-normal">
                    <Link to={`/habits/${h.id}`} className="flex items-center gap-3 font-semibold text-ink no-underline hover:underline">
                      <HabitInitial habit={h} size={32} />
                      {h.name}
                    </Link>
                  </th>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5">
                      <span className="h-2 w-20 overflow-hidden rounded-full bg-oat" aria-hidden="true">
                        <span className="block h-full rounded-full bg-whisky" style={{ width: `${pct ?? 0}%` }} />
                      </span>
                      <span className="font-semibold">{pct === null ? '–' : `${pct}%`}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">{checks}</td>
                  <td className="px-4 py-3">
                    {streak.value} {streak.unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
