import { describe, expect, it } from 'vitest';
import { buildExport, mergeSnapshots, parseImport } from './transfer';
import type { Snapshot } from './types';
import { makeHabit } from '@/test/factories';

const ID_A = '6f1c0b1e-3c1a-4d2e-9b7a-2f9d4a1c0e01';
const ID_B = '6f1c0b1e-3c1a-4d2e-9b7a-2f9d4a1c0e02';
const NOTE = '6f1c0b1e-3c1a-4d2e-9b7a-2f9d4a1c0e03';

const profile: Snapshot['profile'] = {
  name: 'Sam', timezone: 'Europe/Berlin', weekStart: 'monday', defaultRestDays: 1, showStreaks: true, celebrate: true,
};

function snapshot(): Snapshot {
  const a = makeHabit({ id: ID_A, schedule: { type: 'days', days: [0, 2] } });
  return {
    profile,
    habits: [a],
    checkins: [{ habitId: ID_A, date: '2026-11-09' }],
    notes: [{ id: NOTE, habitId: ID_A, date: '2026-11-09', text: 'Rainy', createdAt: '2026-11-09T08:00:00Z' }],
  };
}

describe('export and import', () => {
  it('round-trips a snapshot', () => {
    const original = snapshot();
    const file = buildExport(original, '2026-11-10T09:00:00Z');
    expect(file.habits[0]?.schedules[0]?.days).toEqual(['mon', 'wed']);
    const result = parseImport(JSON.stringify(file));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot).toEqual(original);
      expect(result.summary).toEqual({ habits: 1, checkins: 1, notes: 1 });
    }
  });

  it('explains what is wrong with a bad file', () => {
    expect(parseImport('{nope')).toMatchObject({ ok: false, error: expect.stringContaining('not valid JSON') });
    expect(parseImport('{"hello":1}')).toMatchObject({ ok: false, error: expect.stringContaining('not a Ledger export') });
    expect(parseImport('{"app":"ledger","version":9}')).toMatchObject({ ok: false, error: expect.stringContaining('newer version') });
    const broken = { ...buildExport(snapshot(), 'x'), checkins: [{ habitId: ID_B, date: '2026-11-09' }] };
    expect(parseImport(JSON.stringify(broken))).toMatchObject({ ok: false, error: expect.stringContaining('unknown habit') });
  });
});

describe('mergeSnapshots', () => {
  it('adds new habits, keeps newer copies, and combines check-ins without duplicates', () => {
    const current = snapshot();
    const newer = { ...current.habits[0]!, name: 'Renamed', updatedAt: '2027-01-01T00:00:00Z' };
    const extra = makeHabit({ id: ID_B });
    const incoming: Snapshot = {
      profile: { ...profile, name: 'Other' },
      habits: [newer, extra],
      checkins: [{ habitId: ID_A, date: '2026-11-09' }, { habitId: ID_B, date: '2026-11-08' }],
      notes: [],
    };
    const merged = mergeSnapshots(current, incoming);
    expect(merged.profile.name).toBe('Sam');
    expect(merged.habits.map((h) => h.name)).toEqual(['Renamed', extra.name]);
    expect(merged.checkins).toHaveLength(2);
    expect(merged.notes).toHaveLength(1);
  });
});
