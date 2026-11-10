import type { ProfileSettings } from '@/domain/types';

export const DEFAULT_SETTINGS: Omit<ProfileSettings, 'name' | 'timezone'> = {
  weekStart: 'monday',
  defaultRestDays: 1,
  showStreaks: true,
  celebrate: true,
};

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
