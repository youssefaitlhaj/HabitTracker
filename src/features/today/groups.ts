import type { LedgerStats } from '@/domain/stats';
import { isArchived, isWeekly, versionOn } from '@/domain/schedule';
import type { Habit, LocalDate } from '@/domain/types';

export interface TodayGroups {
  /** Day habits asked for on this date. */
  due: Habit[];
  /** Times-a-week habits. */
  weekly: Habit[];
  /** Day habits not scheduled on this date (read-only). */
  notToday: Habit[];
}

/** Splits the active habits for the Today list (design §8.3). */
export function groupHabits(habits: Habit[], stats: LedgerStats, date: LocalDate): TodayGroups {
  const groups: TodayGroups = { due: [], weekly: [], notToday: [] };
  for (const habit of habits) {
    if (isArchived(habit)) continue;
    const version = versionOn(habit, date);
    if (!version) continue;
    if (isWeekly(version)) groups.weekly.push(habit);
    else if (stats.dayStatus(habit, date) === 'unscheduled') groups.notToday.push(habit);
    else groups.due.push(habit);
  }
  return groups;
}
