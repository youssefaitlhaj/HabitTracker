import type { HeatLevel } from '@/domain/stats';

/** Chart shades from fewer → all habits done (design §7.1). Text on levels 3–4 is light. */
export const HEAT_BG: Record<HeatLevel, string> = {
  0: 'bg-heat-0',
  1: 'bg-heat-1',
  2: 'bg-heat-2',
  3: 'bg-heat-3',
  4: 'bg-heat-4',
};

export const heatText = (level: HeatLevel): string => (level >= 3 ? 'text-on-accent' : 'text-ink');

export const HEAT_LEVELS: HeatLevel[] = [0, 1, 2, 3, 4];
