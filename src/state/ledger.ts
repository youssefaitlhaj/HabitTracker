import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { todayIn } from '@/domain/date';
import { sortHabits } from '@/domain/habits';
import { LedgerStats } from '@/domain/stats';
import type { Checkin, Habit, Note, Profile, Task } from '@/domain/types';
import type { Repositories } from '@/data/ports';
import { useRepos } from './session';

/** Read side: one query per collection, plus derived "today" and stats. */

export type LedgerPart = 'profile' | 'habits' | 'checkins' | 'notes' | 'tasks';

export const ledgerKey = (userId: string, part: LedgerPart) => ['ledger', userId, part] as const;

const LOADERS: { [K in LedgerPart]: (r: Repositories) => Promise<PartData[K]> } = {
  profile: (r) => r.profiles.get(),
  habits: (r) => r.habits.list().then(sortHabits),
  checkins: (r) => r.checkins.list(),
  notes: (r) => r.notes.list(),
  tasks: (r) => r.tasks.list(),
};

export interface PartData {
  profile: Profile;
  habits: Habit[];
  checkins: Checkin[];
  notes: Note[];
  tasks: Task[];
}

function usePart<K extends LedgerPart>(part: K) {
  const { repos, session } = useRepos();
  return useQuery({ queryKey: ledgerKey(session.userId, part), queryFn: () => LOADERS[part](repos) });
}

export const useProfile = () => usePart('profile');
export const useHabits = () => usePart('habits');
export const useCheckins = () => usePart('checkins');
export const useNotes = () => usePart('notes');
export const useTasks = () => usePart('tasks');

/** Today's date in the user's time zone, refreshed every minute so midnight rolls over. */
export function useToday(timezone: string | undefined): string {
  const tz = timezone ?? 'UTC';
  const [today, setToday] = useState(() => todayIn(tz));
  useEffect(() => {
    setToday(todayIn(tz));
    const timer = window.setInterval(() => setToday(todayIn(tz)), 60_000);
    return () => window.clearInterval(timer);
  }, [tz]);
  return today;
}

export interface Ledger {
  profile: Profile;
  habits: Habit[];
  checkins: Checkin[];
  notes: Note[];
  tasks: Task[];
  today: string;
  stats: LedgerStats;
}

/** Everything a signed-in screen needs. `ledger` is null while loading. */
export function useLedger(): { ledger: Ledger | null; error: Error | null } {
  const profile = useProfile();
  const habits = useHabits();
  const checkins = useCheckins();
  const notes = useNotes();
  const tasks = useTasks();
  const today = useToday(profile.data?.timezone);

  const ledger = useMemo(() => {
    if (!profile.data || !habits.data || !checkins.data || !notes.data || !tasks.data) return null;
    const stats = new LedgerStats({
      habits: habits.data,
      checkins: checkins.data,
      weekStart: profile.data.weekStart,
      today,
      accountCreated: todayIn(profile.data.timezone, new Date(profile.data.createdAt)),
    });
    return { profile: profile.data, habits: habits.data, checkins: checkins.data, notes: notes.data, tasks: tasks.data, today, stats };
  }, [profile.data, habits.data, checkins.data, notes.data, tasks.data, today]);

  const error = (profile.error ?? habits.error ?? checkins.error ?? notes.error ?? tasks.error) as Error | null;
  return { ledger, error };
}
