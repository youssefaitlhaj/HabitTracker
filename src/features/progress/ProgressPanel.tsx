import { useState } from 'react';
import { addDays, makeDate } from '@/domain/date';
import type { LocalDate } from '@/domain/types';
import type { Ledger } from '@/state/ledger';
import { Button } from '@/ui/Button';
import { Chip, Segmented } from '@/ui/Choice';
import { DatePicker } from '@/ui/DatePicker';
import { Dialog } from '@/ui/Dialog';
import { HeatLegend, StatTile } from '@/ui/Display';
import { Field, FieldError } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { RangeChart } from './RangeChart';
import { rangeDays, type RangeChoice, type RangeMode, type ResolvedRange } from './range';

/** Range switch + stats + chart (design §8.4). Used on Today (desktop/tablet) and on Progress. */

const MODES: { value: RangeMode; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' },
];

interface ProgressPanelProps {
  ledger: Ledger;
  range: ResolvedRange;
  onChange: (choice: RangeChoice) => void;
  titleId?: string;
  title?: string;
}

export function ProgressPanel({ ledger, range, onChange, titleId = 'progress-h', title = 'Progress' }: ProgressPanelProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const r = ledger.stats.rangeStats(range.from, range.until);

  return (
    <section className="card flex flex-col gap-5 p-5 tablet:p-7" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="m-0 font-display text-2xl font-semibold">
            {title}
          </h2>
          <span className="text-sm text-muted">{range.label}</span>
        </div>
        <Segmented
          stretch
          className="tablet:w-auto"
          label="Time range"
          options={MODES}
          value={range.mode}
          onChange={(mode) => (mode === 'custom' ? setCustomOpen(true) : onChange({ ...range, mode }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 desktop:grid-cols-4">
        <StatTile tone="well" label="Completion" value={r.completion === null ? '–' : `${Math.round(r.completion * 100)}%`} accent />
        <StatTile tone="well" label="Perfect days" value={r.perfectDays} />
        <StatTile tone="well" label="Habits checked" value={r.checks} />
        <StatTile tone="well" label="Days tracked" value={r.daysTracked} />
      </div>

      <RangeChart range={range} stats={ledger.stats} weekStart={ledger.profile.weekStart} />
      <HeatLegend />

      {customOpen && (
        <CustomRangeDialog
          initial={range}
          today={ledger.today}
          earliest={ledger.stats.earliestDate()}
          ledger={ledger}
          onClose={() => setCustomOpen(false)}
          onApply={(from, until) => {
            onChange({ mode: 'custom', from, until });
            setCustomOpen(false);
          }}
        />
      )}
    </section>
  );
}

interface CustomRangeDialogProps {
  initial: ResolvedRange;
  today: LocalDate;
  earliest: LocalDate;
  ledger: Ledger;
  onClose: () => void;
  onApply: (from: LocalDate, until: LocalDate) => void;
}

function CustomRangeDialog({ initial, today, earliest, ledger, onClose, onApply }: CustomRangeDialogProps) {
  const clamp = (d: LocalDate) => (d < earliest ? earliest : d > today ? today : d);
  const [from, setFrom] = useState(clamp(initial.from));
  const [until, setUntil] = useState(clamp(initial.until));
  const toast = useToast();
  const invalid = from > until;

  const presets: { label: string; from: LocalDate }[] = [
    { label: 'Last 7 days', from: addDays(today, -6) },
    { label: 'Last 30 days', from: addDays(today, -29) },
    { label: 'Last 90 days', from: addDays(today, -89) },
    { label: 'This year', from: makeDate(Number(today.slice(0, 4)), 0, 1) },
  ];

  const picker = (value: LocalDate, set: (d: LocalDate) => void, id: string, describedBy?: string) => (
    <DatePicker id={id} describedBy={describedBy} invalid={invalid} value={value} onChange={set} today={today} weekStart={ledger.profile.weekStart} min={earliest} max={today} />
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title="Custom range"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={invalid}
            onClick={() => {
              onApply(from, until);
              toast.show('Showing your custom range.', { kind: 'success' });
            }}
          >
            {invalid ? 'Show range' : `Show ${rangeDays({ from, until })} days`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Chip
              key={p.label}
              tone="light"
              selected={from === clamp(p.from) && until === today}
              onClick={() => {
                setFrom(clamp(p.from));
                setUntil(today);
              }}
            >
              {p.label}
            </Chip>
          ))}
        </div>
        <div className="grid gap-4 tablet:grid-cols-2">
          <Field label="From">{(c) => picker(from, setFrom, c.id, c.describedBy)}</Field>
          <Field label="Until">{(c) => picker(until, setUntil, c.id, c.describedBy)}</Field>
        </div>
        {invalid && <FieldError>The start date has to be on or before the end date.</FieldError>}
      </div>
    </Dialog>
  );
}
