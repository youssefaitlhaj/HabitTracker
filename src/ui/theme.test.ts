import { beforeEach, describe, expect, it } from 'vitest';
import { readThemeChoice, resolveTheme } from './theme';

describe('theme', () => {
  beforeEach(() => localStorage.clear());

  it('follows the system unless the user picked a theme', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('reads the saved choice and ignores unknown values', () => {
    expect(readThemeChoice()).toBe('system');
    localStorage.setItem('ledger.theme', 'dark');
    expect(readThemeChoice()).toBe('dark');
    localStorage.setItem('ledger.theme', 'purple');
    expect(readThemeChoice()).toBe('system');
  });
});
