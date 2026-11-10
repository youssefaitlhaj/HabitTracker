import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { newId, nowIso } from '@/data/defaults';
import { createHabit } from '@/domain/habits';
import type { Category, WeekStart } from '@/domain/types';
import { useHabitActions, useProfileUpdate } from '@/state/actions';
import { useLedger, type Ledger } from '@/state/ledger';
import { Button } from '@/ui/Button';
import { Chip, Segmented, Switch } from '@/ui/Choice';
import { cx } from '@/ui/cx';
import { LoadingScreen } from '@/ui/Display';
import { Field, TextInput } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { Wordmark } from '@/ui/Logo';
import { useToast } from '@/ui/Toast';

/** First-run setup in three steps (design §8.10, Onboarding.dc.html). */

const STARTERS: { name: string; category: Category }[] = [
  { name: 'Morning walk', category: 'health' },
  { name: 'Read 20 pages', category: 'learning' },
  { name: 'Drink 2 litres', category: 'health' },
  { name: 'Meditate 10 min', category: 'mind' },
  { name: 'No phone after 10pm', category: 'mind' },
  { name: 'Stretch', category: 'health' },
  { name: 'Journal 3 lines', category: 'mind' },
  { name: 'In bed by 11pm', category: 'health' },
  { name: 'Work out', category: 'health' },
  { name: 'Practice a language', category: 'learning' },
  { name: 'Tidy up 10 min', category: 'home' },
  { name: 'Message a friend', category: 'social' },
];

const SWEET_SPOT = 5;

export function OnboardingPage() {
  const { ledger } = useLedger();
  if (!ledger) return <LoadingScreen />;
  return <Onboarding ledger={ledger} />;
}

function Onboarding({ ledger }: { ledger: Ledger }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { save } = useHabitActions();
  const profile = useProfileUpdate();
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState<{ name: string; category: Category }[]>(STARTERS.slice(0, 3));
  const [custom, setCustom] = useState('');
  const [reminder, setReminder] = useState<string | null>('20:30');
  const [weekStart, setWeekStart] = useState<WeekStart>(ledger.profile.weekStart);

  const isPicked = (name: string) => picked.some((p) => p.name === name);
  const toggle = (starter: { name: string; category: Category }) => {
    if (isPicked(starter.name)) return setPicked(picked.filter((p) => p.name !== starter.name));
    if (picked.length === SWEET_SPOT) toast.show('That’s a lot to start with. Three to five tends to stick better.', { kind: 'warning' });
    setPicked([...picked, starter]);
  };

  /** Waits for the "onboarded" flag so the first-run gate doesn't send the user back here. */
  const leave = async (message: string, kind: 'success' | 'info', patch: { weekStart?: WeekStart } = {}) => {
    try {
      await profile.mutateAsync({ ...patch, onboarded: true });
      toast.show(message, { kind });
      navigate('/', { replace: true });
    } catch {
      // useOptimistic already showed an error toast with Retry
    }
  };

  const finish = () => {
    picked.forEach((p, i) =>
      save(
        createHabit(
          {
            name: p.name,
            category: p.category,
            color: 'whisky',
            schedule: { type: 'daily', days: null, timesPerWeek: null, restDaysPerWeek: ledger.profile.defaultRestDays },
            startDate: ledger.today,
            reminder,
            why: '',
          },
          newId(),
          i,
          nowIso(),
        ),
      ),
    );
    void leave('Your ledger is ready. Have a good first day.', 'success', { weekStart });
  };

  const skip = () => void leave('Setup skipped. Add habits from Today whenever you like.', 'info');

  const next = () => {
    if (step === 1 && picked.length === 0) return toast.show('Pick at least one habit to continue.', { kind: 'error' });
    if (step < 3) setStep(step + 1);
    else finish();
  };

  const extras = picked.filter((p) => !STARTERS.some((s) => s.name === p.name));
  const headings = ['Pick a few habits to start', 'A nudge at the right time', 'You’re all set'];

  return (
    <div className="mx-auto flex min-h-dvh max-w-[760px] flex-col gap-8 px-4 pb-16 pt-8">
      <div className="flex items-center justify-between gap-4">
        <Wordmark size={40} />
        <Button variant="quiet" size="sm" onClick={skip}>
          Skip setup
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <span key={i} className={cx('h-1.5 rounded-full transition-colors', i <= step ? 'bg-whisky' : 'bg-line')} />
          ))}
        </div>
        <span className="text-[13px] font-semibold text-muted">Step {step} of 3</span>
      </div>

      <section className="flex flex-col gap-6" aria-labelledby="step-h">
        <h1 id="step-h" className="m-0 font-display text-[clamp(32px,5vw,48px)] font-normal leading-[1.05] tracking-tight">
          {headings[step - 1]}
        </h1>

        {step === 1 && (
          <>
            <p className="m-0 -mt-3 text-base text-muted">Three to five is the sweet spot. You can add, change or pause them any time.</p>
            <div className="flex flex-wrap gap-2.5">
              {[...STARTERS, ...extras].map((s) => (
                <Chip key={s.name} selected={isPicked(s.name)} onClick={() => toggle(s)}>
                  <Icon name={isPicked(s.name) ? 'check' : 'plus'} size={14} strokeWidth={3} />
                  {s.name}
                </Chip>
              ))}
            </div>
            <form
              className="flex flex-wrap items-end gap-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                const name = custom.trim();
                if (!name) return toast.show('Type a habit name first.', { kind: 'error' });
                if (!isPicked(name)) toggle({ name, category: 'health' });
                setCustom('');
              }}
            >
              <Field label="Or add your own" className="min-w-[240px] flex-1">
                {(c) => <TextInput id={c.id} maxLength={60} placeholder="e.g. Practice guitar 15 min" value={custom} onChange={(e) => setCustom(e.target.value)} />}
              </Field>
              <Button type="submit" variant="secondary">
                Add
              </Button>
            </form>
          </>
        )}

        {step === 2 && (
          <div className="card flex flex-col px-5">
            <div className="flex items-center justify-between gap-4 border-b border-line-soft py-4">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold">Daily reminder time</span>
                <span className="text-sm text-muted">Saved with your habits; reminders arrive in a later version.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Switch label="Daily reminder" checked={reminder !== null} onChange={(on) => setReminder(on ? '20:30' : null)} />
                <label htmlFor="ob-time" className="sr-only">Reminder time</label>
                <TextInput id="ob-time" type="time" className="!h-11 !w-auto" disabled={reminder === null} value={reminder ?? '20:30'} onChange={(e) => setReminder(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-3 py-4">
              <span className="font-semibold">Week starts on</span>
              <Segmented
                label="Week starts on"
                value={weekStart}
                onChange={setWeekStart}
                options={[
                  { value: 'monday', label: 'Monday' },
                  { value: 'sunday', label: 'Sunday' },
                ]}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {picked.map((p) => (
              <li key={p.name} className="card flex items-center gap-3.5 px-4 py-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-oat-deep font-display font-semibold text-oak" aria-hidden="true">
                  {p.name.charAt(0)}
                </span>
                <span className="flex-1 font-medium">{p.name}</span>
                <span className="text-[13px] text-muted">Every day</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <Button variant="quiet" disabled={step === 1} onClick={() => setStep(step - 1)}>
          Back
        </Button>
        <div className="flex items-center gap-3.5">
          {step === 1 && <span className="text-sm text-muted">{picked.length} selected</span>}
          <Button onClick={next}>{step === 3 ? 'Go to Today' : 'Continue'}</Button>
        </div>
      </div>
    </div>
  );
}
