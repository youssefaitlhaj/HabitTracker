import { addDays, formatDate } from '@/domain/date';
import { isOverdue } from '@/domain/tasks';
import type { LocalDate, Severity, Task } from '@/domain/types';
import { cx } from '@/ui/cx';

/** How tasks look everywhere: severity colours and the "when" wording. */

export const SEVERITY_META: Record<Severity, { label: string; chip: string; bar: string }> = {
  high: { label: 'High', chip: 'bg-error-soft text-error-ink', bar: 'bg-error' },
  medium: { label: 'Medium', chip: 'bg-warning-soft text-warning-ink', bar: 'bg-warning' },
  low: { label: 'Low', chip: 'bg-success-soft text-success-ink', bar: 'bg-success' },
};

export function SeverityChip({ severity, long }: { severity: Severity | null; long?: boolean }) {
  if (!severity) return null;
  const meta = SEVERITY_META[severity];
  return <span className={cx('rounded-full px-2 py-px text-[11px] font-bold', meta.chip)}>{long ? `${meta.label} severity` : meta.label}</span>;
}

/** "Today · 16:30", "Tomorrow", "Mon 16 Nov · 10:00", or null without a date. `omitToday` drops "Today". */
export function describeWhen(task: Task, today: LocalDate, omitToday = false): string | null {
  if (!task.date) return null;
  const day =
    task.date === today ? 'Today' : task.date === addDays(today, 1) ? 'Tomorrow' : formatDate(task.date, { weekday: 'short', day: 'numeric', month: 'short' });
  if (omitToday && task.date === today) return task.time;
  return task.time ? `${day} · ${task.time}` : day;
}

export function WhenLabel({ task, today, omitToday }: { task: Task; today: LocalDate; omitToday?: boolean }) {
  const when = describeWhen(task, today, omitToday);
  if (!when) return null;
  return <span className={cx('text-xs', isOverdue(task, today) ? 'font-semibold text-error' : 'text-muted')}>{when}</span>;
}
