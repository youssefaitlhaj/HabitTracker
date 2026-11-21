import { addDays, diffDays, eachDay, startOfWeek } from '@/domain/date';
import { isScheduledOn } from '@/domain/schedule';
import type { Category, Checkin, Habit, HabitColor, LocalDate, Note, Schedule, Severity, Task } from '@/domain/types';
import { DEFAULT_SETTINGS } from '../defaults';
import type { LocalUserDoc } from '../local/localStore';

/**
 * The sample account behind /demo: about four months of believable history that ends today,
 * so every screen (streaks, heatmaps, Progress, Tasks) has something to show.
 * Seeded randomness keeps it the same on every visit on the same day.
 */

export const DEMO_USER_ID = 'demo';
export const DEMO_EMAIL = 'sam@example.com';
const DEMO_NAME = 'Sam Rivera';
const ACCOUNT_AGE_DAYS = 120;

/** A quieter fortnight a few weeks back (a trip, a cold), so the charts aren't a flat line. */
const DIP = { from: 35, to: 46, factor: 0.45 };
/** Habits marked `onARoll` are done every day lately, for a visible current streak. */
const ROLL_DAYS = 14;

const daily = (restDaysPerWeek: number): Schedule => ({ type: 'daily', days: null, timesPerWeek: null, restDaysPerWeek });
const days = (list: Schedule['days'], restDaysPerWeek: number): Schedule => ({ type: 'days', days: list, timesPerWeek: null, restDaysPerWeek });
const times = (timesPerWeek: number): Schedule => ({ type: 'times', days: null, timesPerWeek, restDaysPerWeek: 0 });

interface HabitSpec {
  key: string;
  name: string;
  category: Category;
  color: HabitColor;
  reminder: string | null;
  why: string;
  /** Schedule versions, oldest first; the first one starts the habit. `ago` = days before today. */
  schedules: { ago: number; schedule: Schedule }[];
  /** Chance of doing it on a day it's due. */
  rate: number;
  onARoll?: boolean;
  doneToday?: boolean;
  /** Archived this many days ago. */
  archivedAgo?: number;
}

const HABITS: HabitSpec[] = [
  { key: 'read', name: 'Read 20 pages', category: 'learning', color: 'oak', reminder: '21:30', why: 'One book a month, twelve this year.', schedules: [{ ago: 118, schedule: daily(1) }], rate: 0.86, onARoll: true },
  { key: 'run', name: 'Morning run', category: 'health', color: 'whisky', reminder: '07:00', why: 'Training for a 10K in the spring.', schedules: [{ ago: 112, schedule: days([0, 2, 4, 5], 1) }], rate: 0.8, doneToday: true },
  { key: 'meditate', name: 'Meditate 10 minutes', category: 'mind', color: 'sage', reminder: '08:00', why: 'Calmer mornings, fewer snap decisions.', schedules: [{ ago: 90, schedule: daily(1) }], rate: 0.72, doneToday: true },
  { key: 'water', name: 'Drink 2 litres of water', category: 'health', color: 'slate', reminder: null, why: 'Fewer afternoon headaches.', schedules: [{ ago: 100, schedule: daily(0) }], rate: 0.9, onARoll: true, doneToday: true },
  { key: 'spanish', name: 'Spanish lesson', category: 'learning', color: 'amber', reminder: '19:00', why: 'Order dinner in Madrid without pointing.', schedules: [{ ago: 63, schedule: times(4) }], rate: 0.75 },
  {
    key: 'tidy',
    name: 'Tidy up for 15 minutes',
    category: 'home',
    color: 'clay',
    reminder: '18:30',
    why: 'A clear desk on Monday morning.',
    schedules: [
      { ago: 105, schedule: daily(1) },
      { ago: 40, schedule: days([0, 1, 2, 3, 4], 0) },
    ],
    rate: 0.7,
  },
  { key: 'family', name: 'Call family', category: 'social', color: 'amber', reminder: null, why: 'Stay close to my parents and my sister.', schedules: [{ ago: 98, schedule: times(2) }], rate: 0.85 },
  { key: 'phone', name: 'No phone after 22:00', category: 'mind', color: 'slate', reminder: '22:00', why: 'Better sleep.', schedules: [{ ago: 80, schedule: daily(1) }], rate: 0.55, archivedAgo: 21 },
];

const NOTES: { habit: string; ago: number; text: string }[] = [
  { habit: 'run', ago: 3, text: 'Easy 5 km, legs felt fresh.' },
  { habit: 'run', ago: 17, text: 'First 8 km without stopping!' },
  { habit: 'run', ago: 40, text: 'Skipped: rain and a cold coming on.' },
  { habit: 'read', ago: 2, text: 'Finished “The Overstory”. Something lighter next.' },
  { habit: 'read', ago: 30, text: 'Reading before bed instead of scrolling helps me sleep.' },
  { habit: 'meditate', ago: 9, text: 'Hard to focus today; 5 minutes is still 5 minutes.' },
  { habit: 'spanish', ago: 6, text: 'The past tense is finally clicking.' },
  { habit: 'tidy', ago: 38, text: 'Switched to weekdays only. Weekends are for resting.' },
  { habit: 'family', ago: 13, text: 'Long call with Grandma. She told the bakery story again.' },
];

interface TaskSpec {
  title: string;
  notes?: string;
  /** Days before today it is due (negative = in the future); undefined = no date. */
  dueAgo?: number;
  time?: string;
  severity?: Severity;
  /** Days before today it was checked off. */
  doneAgo?: number;
}

const TASKS: TaskSpec[] = [
  { title: 'Send the quarterly report', notes: 'Numbers from finance are in the shared folder.', dueAgo: 0, time: '11:00', severity: 'high' },
  { title: 'Dentist appointment', notes: 'Bring the insurance card.', dueAgo: 0, time: '16:30', severity: 'high' },
  { title: 'Buy new running shoes', dueAgo: 0, severity: 'medium' },
  { title: 'Reply to Alex about the trip', dueAgo: 0, severity: 'medium', doneAgo: 0 },
  { title: 'Renew passport', notes: 'Photos done; the form still needs filling in.', dueAgo: 2, severity: 'high' },
  { title: 'Pay the electricity bill', dueAgo: 1, severity: 'medium' },
  { title: 'Call the landlord about the heater', dueAgo: -1, time: '10:00', severity: 'medium' },
  { title: 'Book train tickets for the holidays', dueAgo: -3, time: '09:00', severity: 'medium' },
  { title: 'Plan Mum’s birthday dinner', notes: 'She liked the Lebanese place last year.', dueAgo: -6, severity: 'low' },
  { title: 'Try a new pasta recipe', severity: 'low' },
  { title: 'Sort out old photos' },
  { title: 'Buy groceries for the week', dueAgo: 1, doneAgo: 1 },
  { title: 'Write thank-you notes', dueAgo: 5, severity: 'low', doneAgo: 4 },
  { title: 'Submit tax documents', notes: 'Sent by email, confirmation saved.', dueAgo: 9, severity: 'high', doneAgo: 8 },
  { title: 'Fix the bike brakes', dueAgo: 12, severity: 'medium', doneAgo: 12 },
  { title: 'Return library books', dueAgo: 16, severity: 'low', doneAgo: 16 },
  { title: 'Order new glasses', dueAgo: 20, severity: 'medium', doneAgo: 19 },
  { title: 'Clean out the fridge', dueAgo: 24, severity: 'low', doneAgo: 24 },
  { title: 'Set up automatic savings', dueAgo: 31, severity: 'high', doneAgo: 30 },
  { title: 'Book the annual check-up', dueAgo: 38, severity: 'medium', doneAgo: 36 },
  { title: 'Back up the laptop', dueAgo: 45, severity: 'low', doneAgo: 45 },
  { title: 'Cancel unused subscriptions', dueAgo: 52, severity: 'medium', doneAgo: 50 },
];

/** Small seeded random number generator (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const at = (date: LocalDate, time = '09:00') => `${date}T${time}:00.000Z`;

/** Fixed ids in UUID format (what real accounts use, and what import accepts). */
const ID_KIND = { habit: 1, task: 2, note: 3 } as const;
const demoId = (kind: keyof typeof ID_KIND, n: number) =>
  `de${ID_KIND[kind].toString(16).padStart(6, '0')}-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const habitId = (key: string) => demoId('habit', HABITS.findIndex((h) => h.key === key) + 1);

function buildHabit(spec: HabitSpec, order: number, today: LocalDate): Habit {
  const startDate = addDays(today, -spec.schedules[0]!.ago);
  return {
    id: habitId(spec.key),
    name: spec.name,
    category: spec.category,
    color: spec.color,
    reminder: spec.reminder,
    startDate,
    why: spec.why,
    order,
    schedules: spec.schedules.map(({ ago, schedule }) => ({ ...schedule, effectiveFrom: addDays(today, -ago) })),
    pauses: spec.archivedAgo === undefined ? [] : [{ from: addDays(today, -spec.archivedAgo), to: null }],
    createdAt: at(startDate),
    updatedAt: at(startDate),
  };
}

/** Which days the habit was checked off, from its start until today. */
function buildCheckins(spec: HabitSpec, habit: Habit, today: LocalDate, random: () => number): Checkin[] {
  const last = spec.archivedAgo === undefined ? addDays(today, -1) : addDays(today, -spec.archivedAgo - 1);
  const scheduleOn = (date: LocalDate) =>
    [...habit.schedules].reverse().find((v) => v.effectiveFrom <= date) ?? habit.schedules[0]!;
  const chance = (date: LocalDate) => {
    const ago = diffDays(date, today);
    if (spec.onARoll && ago <= ROLL_DAYS) return 1;
    return ago >= DIP.from && ago <= DIP.to ? spec.rate * DIP.factor : spec.rate;
  };

  const dates: LocalDate[] = [];
  const past = habit.startDate <= last ? eachDay(habit.startDate, last) : [];
  const weekly = past.filter((d) => scheduleOn(d).type === 'times');
  past.filter((d) => scheduleOn(d).type !== 'times').forEach((d) => {
    if (isScheduledOn(scheduleOn(d), d) && random() < chance(d)) dates.push(d);
  });

  // "N times a week": pick N of the week's days, one fewer in an off week.
  const weeks = new Map<LocalDate, LocalDate[]>();
  weekly.forEach((d) => weeks.set(startOfWeek(d, 'monday'), [...(weeks.get(startOfWeek(d, 'monday')) ?? []), d]));
  weeks.forEach((weekDays) => {
    const target = scheduleOn(weekDays[0]!).timesPerWeek ?? 0;
    const wanted = random() < chance(weekDays[0]!) ? target : target - 1;
    const fair = Math.round((weekDays.length * target) / 7);
    const shuffled = [...weekDays].sort(() => random() - 0.5);
    dates.push(...shuffled.slice(0, Math.max(0, Math.min(wanted, fair))));
  });

  const todayVersion = scheduleOn(today);
  if (spec.doneToday && spec.archivedAgo === undefined && (todayVersion.type === 'times' || isScheduledOn(todayVersion, today))) dates.push(today);
  return dates.map((date) => ({ habitId: habit.id, date }));
}

function buildTask(spec: TaskSpec, index: number, today: LocalDate): Task {
  const date = spec.dueAgo === undefined ? null : addDays(today, -spec.dueAgo);
  const created = addDays(date ?? today, -4 - (index % 5));
  const doneOn = spec.doneAgo === undefined ? null : addDays(today, -spec.doneAgo);
  return {
    id: demoId('task', index + 1),
    title: spec.title,
    notes: spec.notes ?? '',
    date,
    time: date && spec.time ? spec.time : null,
    severity: spec.severity ?? null,
    doneOn,
    createdAt: at(created),
    updatedAt: at(doneOn ?? created),
  };
}

export function demoAccount(today: LocalDate, timezone: string): LocalUserDoc {
  const random = seeded(20_261_121);
  const habits = HABITS.map((spec, i) => ({ spec, habit: buildHabit(spec, i, today) }));
  const notes: Note[] = NOTES.map((n, i) => ({
    id: demoId('note', i + 1),
    habitId: habitId(n.habit),
    date: addDays(today, -n.ago),
    text: n.text,
    createdAt: at(addDays(today, -n.ago), '20:00'),
  }));
  return {
    id: DEMO_USER_ID,
    email: DEMO_EMAIL,
    passwordHash: '',
    createdAt: at(addDays(today, -ACCOUNT_AGE_DAYS), '08:00'),
    settings: { ...DEFAULT_SETTINGS, name: DEMO_NAME, timezone },
    avatarUrl: null,
    onboarded: true,
    lastExportAt: at(addDays(today, -12), '18:00'),
    deletionRequestedAt: null,
    habits: habits.map((h) => h.habit),
    checkins: habits.flatMap(({ spec, habit }) => buildCheckins(spec, habit, today, random)),
    notes,
    tasks: TASKS.map((spec, i) => buildTask(spec, i, today)),
  };
}
