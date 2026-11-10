import { describe, expect, it } from 'vitest';
import { applyHabitEdit, archiveHabit, draftFromHabit, moveHabit, restoreHabit, validateHabitDraft } from './habits';
import { versionOn } from './schedule';
import { makeHabit } from '@/test/factories';

const NOW = '2026-11-10T09:00:00Z';

describe('applyHabitEdit', () => {
  it('adds a new schedule version from today and keeps the old one for the past', () => {
    const habit = makeHabit({ startDate: '2026-11-01' });
    const draft = { ...draftFromHabit(habit), schedule: { type: 'days' as const, days: [0 as const], timesPerWeek: null, restDaysPerWeek: 0 } };
    const edited = applyHabitEdit(habit, draft, '2026-11-10', NOW);
    expect(edited.schedules).toHaveLength(2);
    expect(versionOn(edited, '2026-11-05')?.type).toBe('daily');
    expect(versionOn(edited, '2026-11-10')?.type).toBe('days');
  });

  it('does not add a version when only the name changes', () => {
    const habit = makeHabit();
    const edited = applyHabitEdit(habit, { ...draftFromHabit(habit), name: ' New name ' }, '2026-11-10', NOW);
    expect(edited.schedules).toHaveLength(1);
    expect(edited.name).toBe('New name');
  });

  it('moves the first version with the start date', () => {
    const habit = makeHabit({ startDate: '2026-11-05' });
    const edited = applyHabitEdit(habit, { ...draftFromHabit(habit), startDate: '2026-10-01' }, '2026-11-10', NOW);
    expect(edited.schedules[0]?.effectiveFrom).toBe('2026-10-01');
  });
});

describe('validateHabitDraft', () => {
  it('requires a name, a day for specific-day schedules, and a start before existing check-ins', () => {
    const draft = { ...draftFromHabit(makeHabit()), name: ' ', startDate: '2026-11-08' };
    draft.schedule = { type: 'days', days: [], timesPerWeek: null, restDaysPerWeek: 0 };
    expect(validateHabitDraft(draft, '2026-11-05')).toEqual({
      name: 'Give your habit a name.',
      days: 'Pick at least one day of the week.',
      startDate: 'This habit already has check-ins before that date.',
    });
  });
});

describe('archive and restore', () => {
  it('records the archived period and closes it on restore', () => {
    const archived = archiveHabit(makeHabit(), '2026-11-03', NOW);
    expect(archived.pauses).toEqual([{ from: '2026-11-03', to: null }]);
    expect(restoreHabit(archived, '2026-11-10', NOW).pauses).toEqual([{ from: '2026-11-03', to: '2026-11-09' }]);
  });

  it('leaves no gap when restored on the same day', () => {
    const archived = archiveHabit(makeHabit(), '2026-11-10', NOW);
    expect(restoreHabit(archived, '2026-11-10', NOW).pauses).toEqual([]);
  });
});

describe('moveHabit', () => {
  it('swaps neighbours and ignores moves past the ends', () => {
    const [a, b, c] = [makeHabit({ order: 0 }), makeHabit({ order: 1 }), makeHabit({ order: 2 })];
    expect(moveHabit([a!, b!, c!], b!.id, -1)).toEqual([b!.id, a!.id, c!.id]);
    expect(moveHabit([a!, b!, c!], a!.id, -1)).toEqual([a!.id, b!.id, c!.id]);
  });
});
