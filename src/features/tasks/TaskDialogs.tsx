import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { formatLong } from '@/domain/date';
import { draftFromTask, emptyTaskDraft, TASK_NOTES_MAX, TASK_TITLE_MAX, validateTaskDraft, type TaskDraftErrors } from '@/domain/tasks';
import { SEVERITIES, type Severity, type Task, type TaskDraft } from '@/domain/types';
import { useTaskActions } from '@/state/actions';
import { useLedger, type Ledger } from '@/state/ledger';
import { Button } from '@/ui/Button';
import { Segmented } from '@/ui/Choice';
import { DatePicker } from '@/ui/DatePicker';
import { Dialog } from '@/ui/Dialog';
import { Field, TextArea, TextInput } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { describeWhen, SEVERITY_META, SeverityChip } from './taskStyle';

/** The task popups (design: TaskDialogs.dc.html), openable from anywhere. */

interface TaskDialogsApi {
  /** Details popup (the eye button). */
  show: (task: Task) => void;
  /** Editor: edit a task, or create one (optionally with a preset date). */
  edit: (task?: Task, preset?: Partial<TaskDraft>) => void;
}

type OpenDialog = { kind: 'details'; id: string } | { kind: 'edit'; task: Task | null; preset: Partial<TaskDraft>; key: number };

const TaskDialogsContext = createContext<TaskDialogsApi | null>(null);

export function useTaskDialogs(): TaskDialogsApi {
  const api = useContext(TaskDialogsContext);
  if (!api) throw new Error('useTaskDialogs must be used inside <TaskDialogsProvider>');
  return api;
}

export function TaskDialogsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<OpenDialog | null>(null);
  const { ledger } = useLedger();
  const close = useCallback(() => setOpen(null), []);
  const show = useCallback((task: Task) => setOpen({ kind: 'details', id: task.id }), []);
  const edit = useCallback((task?: Task, preset: Partial<TaskDraft> = {}) => setOpen({ kind: 'edit', task: task ?? null, preset, key: Date.now() }), []);
  const api = useMemo(() => ({ show, edit }), [show, edit]);

  // Details always shows the latest version of the task (e.g. right after it was checked off).
  const detailsTask = open?.kind === 'details' ? ledger?.tasks.find((t) => t.id === open.id) : undefined;

  return (
    <TaskDialogsContext.Provider value={api}>
      {children}
      {ledger && detailsTask && <TaskDetailsDialog task={detailsTask} ledger={ledger} onClose={close} onEdit={() => edit(detailsTask)} />}
      {ledger && open?.kind === 'edit' && <TaskEditorDialog key={open.key} task={open.task} preset={open.preset} ledger={ledger} onClose={close} />}
    </TaskDialogsContext.Provider>
  );
}

function TaskDetailsDialog({ task, ledger, onClose, onEdit }: { task: Task; ledger: Ledger; onClose: () => void; onEdit: () => void }) {
  const actions = useTaskActions();
  const done = !!task.doneOn;
  const when = describeWhen(task, ledger.today);
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={task.title}
      footer={
        <>
          <Button
            variant="quiet"
            className="mr-auto !text-error"
            onClick={() => {
              actions.remove(task);
              onClose();
            }}
          >
            Delete
          </Button>
          <Button variant="secondary" icon="edit" onClick={onEdit}>
            Edit
          </Button>
          <Button
            icon={done ? 'restore' : 'check'}
            onClick={() => {
              actions.setDone(task, !done, ledger.today);
              onClose();
            }}
          >
            {done ? 'Reopen' : 'Mark done'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {(task.severity || when) && (
          <div className="flex flex-wrap gap-2">
            <SeverityChip severity={task.severity} long />
            {when && <span className="rounded-full border border-line px-3 py-0.5 text-[13px]">{when}</span>}
          </div>
        )}
        <div className="flex flex-col gap-1.5 rounded-[14px] bg-paper px-4 py-3.5">
          <span className="eyebrow">Notes</span>
          <p className="m-0 whitespace-pre-line break-words text-[15px] leading-relaxed">{task.notes || <span className="text-muted">No notes.</span>}</p>
        </div>
        <span className="text-[13px] text-muted">
          Added {formatLong(task.createdAt.slice(0, 10))} · {done ? `done ${formatLong(task.doneOn!)}` : 'not done yet'}
        </span>
      </div>
    </Dialog>
  );
}

type SeverityChoice = Severity | 'none';

const SEVERITY_OPTIONS: { value: SeverityChoice; label: string }[] = [
  { value: 'none', label: 'None' },
  ...SEVERITIES.map((s) => ({ value: s, label: SEVERITY_META[s].label })),
];

function TaskEditorDialog({ task, preset, ledger, onClose }: { task: Task | null; preset: Partial<TaskDraft>; ledger: Ledger; onClose: () => void }) {
  const actions = useTaskActions();
  const toast = useToast();
  const [draft, setDraft] = useState<TaskDraft>(() => (task ? draftFromTask(task) : { ...emptyTaskDraft(), ...preset }));
  const [errors, setErrors] = useState<TaskDraftErrors>({});
  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key === 'date' ? 'time' : key]: undefined }));
  };

  const submit = () => {
    const found = validateTaskDraft(draft);
    setErrors(found);
    if (found.title || found.time) return toast.show('Please fix the highlighted fields.', { kind: 'error' });
    if (task) actions.update(task, draft);
    else actions.create(draft);
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{task ? 'Save changes' : 'Add task'}</Button>
        </>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Name" error={errors.title}>
          {(c) => (
            <TextInput id={c.id} aria-describedby={c.describedBy} invalid={c.invalid} maxLength={TASK_TITLE_MAX} placeholder="e.g. Renew passport" value={draft.title} onChange={(e) => set('title', e.target.value)} data-autofocus />
          )}
        </Field>
        <Field label={<>Notes <span className="font-normal text-muted">(optional)</span></>}>
          {(c) => <TextArea id={c.id} rows={3} maxLength={TASK_NOTES_MAX} placeholder="Details, links, what to bring…" value={draft.notes} onChange={(e) => set('notes', e.target.value)} />}
        </Field>
        <div className="grid gap-4 tablet:grid-cols-2">
          <Field label={<>Date <span className="font-normal text-muted">(optional)</span></>}>
            {(c) => (
              <DatePicker
                id={c.id}
                value={draft.date}
                onChange={(d) => set('date', d)}
                onClear={() => setDraft((d) => ({ ...d, date: null, time: null }))}
                today={ledger.today}
                weekStart={ledger.profile.weekStart}
              />
            )}
          </Field>
          <Field label={<>Time <span className="font-normal text-muted">(optional)</span></>} error={errors.time} hint={draft.date ? undefined : 'Pick a date first.'}>
            {(c) => (
              <TextInput id={c.id} aria-describedby={c.describedBy} invalid={c.invalid} type="time" disabled={!draft.date} value={draft.time ?? ''} onChange={(e) => set('time', e.target.value || null)} />
            )}
          </Field>
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-semibold">
            Severity <span className="font-normal text-muted">(optional)</span>
          </span>
          <Segmented<SeverityChoice> stretch label="Severity" options={SEVERITY_OPTIONS} value={draft.severity ?? 'none'} onChange={(v) => set('severity', v === 'none' ? null : v)} />
        </div>
      </form>
    </Dialog>
  );
}
