import { Link } from 'react-router-dom';
import { moveHabit } from '@/domain/habits';
import { currentSchedule, isArchived } from '@/domain/schedule';
import type { Habit } from '@/domain/types';
import { useHabitActions } from '@/state/actions';
import { LedgerView } from '@/app/shell/LedgerView';
import type { Ledger } from '@/state/ledger';
import { Button, IconButton } from '@/ui/Button';
import { EmptyState, PageHeader, SectionTitle } from '@/ui/Display';
import { NewHabitButton } from './HabitEditor';
import { HabitInitial } from './HabitCard';
import { CATEGORY_LABEL, describeSchedule } from './habitStyle';

export function HabitsPage() {
  return <LedgerView>{(ledger) => <HabitsView ledger={ledger} />}</LedgerView>;
}

function HabitsView({ ledger }: { ledger: Ledger }) {
  const { reorder, restore } = useHabitActions();
  const active = ledger.habits.filter((h) => !isArchived(h));
  const archived = ledger.habits.filter(isArchived);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader title="All habits" actions={<NewHabitButton className="hidden tablet:inline-flex" />} />
      {active.length === 0 ? (
        <EmptyState icon="list" title="No active habits" action={<NewHabitButton>Add a habit</NewHabitButton>}>
          Archived habits stay below with their history.
        </EmptyState>
      ) : (
        <ul className="card m-0 flex list-none flex-col p-0">
          {active.map((h, i) => (
            <HabitRow key={h.id} habit={h}>
              <IconButton icon="arrowUp" label={`Move ${h.name} up`} disabled={i === 0} onClick={() => reorder(moveHabit(active, h.id, -1))} />
              <IconButton icon="arrowDown" label={`Move ${h.name} down`} disabled={i === active.length - 1} onClick={() => reorder(moveHabit(active, h.id, 1))} />
            </HabitRow>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="archived-h">
          <SectionTitle id="archived-h" aside="History is kept">
            Archived
          </SectionTitle>
          <ul className="card m-0 flex list-none flex-col p-0">
            {archived.map((h) => (
              <HabitRow key={h.id} habit={h}>
                <Button size="sm" variant="secondary" icon="restore" onClick={() => restore(h, ledger.today)}>
                  Restore
                </Button>
              </HabitRow>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function HabitRow({ habit, children }: { habit: Habit; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3.5 border-t border-line-soft px-4 py-3 first:border-t-0">
      <HabitInitial habit={habit} size={40} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link to={`/habits/${habit.id}`} className="truncate font-semibold text-ink no-underline hover:underline">
          {habit.name}
        </Link>
        <span className="truncate text-[13px] text-muted">
          {CATEGORY_LABEL[habit.category]} · {describeSchedule(currentSchedule(habit))}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </li>
  );
}
