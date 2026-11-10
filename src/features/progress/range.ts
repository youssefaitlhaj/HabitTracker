import { useEffect, useState } from 'react';
import { addDays, diffDays, endOfMonth, endOfWeek, formatDate, formatRange, isLocalDate, startOfMonth, startOfWeek } from '@/domain/date';
import type { LocalDate, WeekStart } from '@/domain/types';

/** Progress range (design §8.4): Week, Month, Year or a custom From–Until, remembered per device. */

export type RangeMode = 'week' | 'month' | 'year' | 'custom';

export interface RangeChoice {
  mode: RangeMode;
  from: LocalDate;
  until: LocalDate;
}

export interface ResolvedRange extends RangeChoice {
  label: string;
}

const STORAGE_KEY = 'ledger.range';
export const CALENDAR_MAX_DAYS = 42;

export function resolveRange(choice: RangeChoice, today: LocalDate, weekStart: WeekStart): ResolvedRange {
  switch (choice.mode) {
    case 'week': {
      const from = startOfWeek(today, weekStart);
      return { ...choice, from, until: endOfWeek(today, weekStart), label: `This week · ${formatRange(from, addDays(from, 6))}` };
    }
    case 'month':
      return { ...choice, from: startOfMonth(today), until: endOfMonth(today), label: formatDate(today, { month: 'long', year: 'numeric' }) };
    case 'year': {
      const from = addDays(today, -364);
      return { ...choice, from, until: today, label: `Past 12 months · ${formatRange(from, today)}` };
    }
    default:
      return { ...choice, label: formatRange(choice.from, choice.until) };
  }
}

export const rangeDays = (r: { from: LocalDate; until: LocalDate }) => diffDays(r.from, r.until) + 1;

function load(today: LocalDate): RangeChoice {
  const fallback: RangeChoice = { mode: 'year', from: addDays(today, -29), until: today };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as RangeChoice | null;
    if (saved && ['week', 'month', 'year', 'custom'].includes(saved.mode) && isLocalDate(saved.from) && isLocalDate(saved.until)) return saved;
  } catch {
    // ignore unreadable storage
  }
  return fallback;
}

export function useRangeChoice(today: LocalDate) {
  const [choice, setChoice] = useState<RangeChoice>(() => load(today));
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
    } catch {
      // storage may be unavailable (private mode); the range just isn't remembered
    }
  }, [choice]);
  return [choice, setChoice] as const;
}
