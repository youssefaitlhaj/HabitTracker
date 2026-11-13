import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { newId, nowIso } from '@/data/defaults';
import { applyHabitEdit, createHabit, draftFromHabit, hasErrors, NAME_MAX, validateHabitDraft, type HabitDraftErrors } from '@/domain/habits';
import { CATEGORIES, HABIT_COLORS, type Habit, type HabitDraft, type Schedule, type ScheduleType } from '@/domain/types';
import { useHabitActions } from '@/state/actions';
import { useLedger, type Ledger } from '@/state/ledger';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Chip, Segmented, Stepper, Switch } from '@/ui/Choice';
import { cx } from '@/ui/cx';
import { DatePicker } from '@/ui/DatePicker';
import { Dialog } from '@/ui/Dialog';
import { Field, FieldError, TextArea, TextInput } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { useDeleteHabit } from './DeleteHabit';
import { CATEGORY_LABEL, COLOR_LABEL, HABIT_COLOR_HEX, WEEKDAYS } from './habitStyle';

/** Opens the create / edit dialog from anywhere (desktop button, phone "+", habit pages). */

interface EditorApi {
  open: (habit?: Habit) => void;
}

const EditorContext = createContext<EditorApi | null>(null);

export function useHabitEditor(): EditorApi {
  const api = useContext(EditorContext);
  if (!api) throw new Error('useHabitEditor must be used inside <HabitEditorProvider>');
  return api;
}

export function HabitEditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ habit: Habit | null; key: number } | null>(null);
  const open = useCallback((habit?: Habit) => setState({ habit: habit ?? null, key: Date.now() }), []);
  const api = useMemo(() => ({ open }), [open]);
  const { ledger } = useLedger();
  return (
    <EditorContext.Provider value={api}>
      {children}
      {state && ledger && <HabitEditorDialog key={state.key} habit={state.habit} ledger={ledger} onClose={() => setState(null)} />}
    </EditorContext.Provider>
  );
}

const FREQUENCIES: { value: ScheduleType; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'days', label: 'Specific days' },
  { value: 'times', label: 'Times a week' },
];

function emptyDraft(ledger: Ledger): HabitDraft {
  return {
    name: '',
    category: 'health',
    color: 'whisky',
    schedule: { type: 'daily', days: [0, 1, 2, 3, 4], timesPerWeek: 3, restDaysPerWeek: ledger.profile.defaultRestDays },
    startDate: ledger.today,
    reminder: null,
    why: '',
  };
}

interface DialogProps {
  habit: Habit | null;
  ledger: Ledger;
  onClose: () => void;
}

function HabitEditorDialog({ habit, ledger, onClose }: DialogProps) {
  const initial = useMemo(() => (habit ? draftFromHabit(habit) : emptyDraft(ledger)), [habit, ledger]);
  const [draft, setDraft] = useState<HabitDraft>(initial);
  const [errors, setErrors] = useState<HabitDraftErrors>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const { save } = useHabitActions();
  const toast = useToast();
  const deletion = useDeleteHabit(onClose);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const habitCheckins = habit ? ledger.checkins.filter((c) => c.habitId === habit.id) : [];
  const earliestCheckin = habitCheckins.reduce<string | null>((min, c) => (!min || c.date < min ? c.date : min), null);

  const set = <K extends keyof HabitDraft>(key: K, value: HabitDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setConfirmDiscard(false);
  };
  const setSchedule = (patch: Partial<Schedule>) => set('schedule', { ...draft.schedule, ...patch });

  const close = () => (dirty ? setConfirmDiscard(true) : onClose());

  const submit = () => {
    const found = validateHabitDraft(draft, earliestCheckin);
    setErrors(found);
    if (hasErrors(found)) {
      toast.show('Please fix the highlighted fields.', { kind: 'error' });
      return;
    }
    const now = nowIso();
    save(habit ? applyHabitEdit(habit, draft, ledger.today, now) : createHabit(draft, newId(), ledger.habits.length, now));
    toast.show(habit ? 'Changes saved.' : `“${draft.name.trim()}” created. It shows up on Today.`, { kind: 'success' });
    onClose();
  };

  const weekly = draft.schedule.type === 'times';

  return (
    <>
      <Dialog
        open
        onClose={close}
        title={habit ? 'Edit habit' : 'New habit'}
        footer={
          <>
            {habit && (
              <Button variant="quiet" className="mr-auto !text-error" onClick={() => deletion.ask(habit, ledger.today, habitCheckins.length)}>
                Delete habit
              </Button>
            )}
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={submit}>{habit ? 'Save changes' : 'Create habit'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <Field label="Name" error={errors.name} aside={<span className="text-xs text-muted">{draft.name.length}/{NAME_MAX}</span>}>
            {(c) => (
              <TextInput
                id={c.id}
                aria-describedby={c.describedBy}
                invalid={c.invalid}
                maxLength={NAME_MAX}
                placeholder="e.g. Morning walk"
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                data-autofocus
              />
            )}
          </Field>

          <div className="flex flex-wrap gap-6">
            <fieldset className="m-0 flex min-w-[260px] flex-1 flex-col gap-2.5 border-0 p-0">
              <legend className="mb-2.5 p-0 text-sm font-semibold">Category</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <Chip key={c} selected={draft.category === c} onClick={() => set('category', c)}>
                    {CATEGORY_LABEL[c]}
                  </Chip>
                ))}
              </div>
            </fieldset>
            <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
              <legend className="mb-2.5 p-0 text-sm font-semibold">Color</legend>
              <div className="flex flex-wrap gap-2">
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={COLOR_LABEL[c]}
                    aria-pressed={draft.color === c}
                    onClick={() => set('color', c)}
                    className={cx('h-10 w-10 rounded-field border-[3px]', draft.color === c ? 'border-surface' : 'border-transparent')}
                    style={{ background: HABIT_COLOR_HEX[c], boxShadow: draft.color === c ? `0 0 0 2px ${HABIT_COLOR_HEX[c]}` : undefined }}
                  />
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold">How often</span>
            <Segmented stretch className="tablet:w-auto" label="How often" options={FREQUENCIES} value={draft.schedule.type} onChange={(type) => setSchedule({ type })} />
            {draft.schedule.type === 'days' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days of the week">
                  {WEEKDAYS.map((d) => {
                    const on = (draft.schedule.days ?? []).includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        aria-pressed={on}
                        aria-label={d.full}
                        onClick={() =>
                          setSchedule({ days: on ? (draft.schedule.days ?? []).filter((x) => x !== d.value) : [...(draft.schedule.days ?? []), d.value] })
                        }
                        className={cx(
                          'h-11 w-11 rounded-full border-[1.5px] text-sm font-semibold',
                          on ? 'border-whisky bg-whisky text-on-accent' : 'border-line-strong bg-field text-ink',
                        )}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
                {errors.days && <FieldError>{errors.days}</FieldError>}
              </div>
            )}
            {weekly && (
              <div className="flex flex-wrap items-center gap-3">
                <Stepper
                  label="times a week"
                  value={draft.schedule.timesPerWeek ?? 3}
                  min={1}
                  max={7}
                  onChange={(timesPerWeek) => setSchedule({ timesPerWeek })}
                />
                <span className="text-sm text-muted">times a week, on any days</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <Field label="Start date" error={errors.startDate} className="min-w-[240px] flex-1">
              {(c) => (
                <DatePicker
                  id={c.id}
                  describedBy={c.describedBy}
                  invalid={c.invalid}
                  value={draft.startDate}
                  onChange={(d) => set('startDate', d)}
                  today={ledger.today}
                  weekStart={ledger.profile.weekStart}
                />
              )}
            </Field>
            <Field label="Reminder time" hint="Saved now; reminders arrive in a later version." className="min-w-[200px] flex-1">
              {(c) => (
                <div className="flex items-center gap-2.5">
                  <Switch label="Reminder" checked={draft.reminder !== null} onChange={(on) => set('reminder', on ? '07:30' : null)} />
                  <TextInput
                    id={c.id}
                    aria-describedby={c.describedBy}
                    type="time"
                    className="!w-auto"
                    disabled={draft.reminder === null}
                    value={draft.reminder ?? '07:30'}
                    onChange={(e) => set('reminder', e.target.value)}
                  />
                </div>
              )}
            </Field>
          </div>

          {!weekly && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-paper px-4 py-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">Rest days per week</span>
                <span className="text-[13px] text-muted">Missed days that won’t break your streak</span>
              </div>
              <Stepper
                label="rest days per week"
                value={draft.schedule.restDaysPerWeek}
                min={0}
                max={2}
                onChange={(restDaysPerWeek) => setSchedule({ restDaysPerWeek })}
                onLimit={(edge) => edge === 'max' && toast.show('Two rest days a week is the maximum.', { kind: 'warning' })}
              />
            </div>
          )}

          <Field label={<>Why it matters <span className="font-normal text-muted">(optional)</span></>}>
            {(c) => (
              <TextArea
                id={c.id}
                rows={2}
                maxLength={500}
                placeholder="A line for the days motivation runs low"
                value={draft.why}
                onChange={(e) => set('why', e.target.value)}
              />
            )}
          </Field>

          {confirmDiscard && (
            <Banner
              kind="warning"
              title="Discard your unsaved changes?"
              action={
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setConfirmDiscard(false)}>
                    Keep editing
                  </Button>
                  <Button size="sm" variant="dark" onClick={onClose}>
                    Discard
                  </Button>
                </div>
              }
            />
          )}
        </div>
      </Dialog>
      {deletion.dialog}
    </>
  );
}

export function NewHabitButton({ className, children = 'New habit' }: { className?: string; children?: ReactNode }) {
  const editor = useHabitEditor();
  return (
    <Button icon="plus" className={className} onClick={() => editor.open()}>
      {children}
    </Button>
  );
}
