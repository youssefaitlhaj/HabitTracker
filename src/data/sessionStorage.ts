/**
 * "Keep me signed in" (design §8.1): when unticked, the session lives in sessionStorage
 * and ends when the browser closes. Shared by both auth implementations.
 */

const REMEMBER_KEY = 'ledger.remember';

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function setRemember(remember: boolean): void {
  safe(() => localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0'), undefined);
}

function remembered(): boolean {
  return safe(() => localStorage.getItem(REMEMBER_KEY) !== '0', true);
}

const area = (): Storage => (remembered() ? localStorage : sessionStorage);

export const sessionStore = {
  getItem: (key: string): string | null => safe(() => area().getItem(key) ?? sessionStorage.getItem(key), null),
  setItem: (key: string, value: string): void => safe(() => area().setItem(key, value), undefined),
  removeItem: (key: string): void =>
    safe(() => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }, undefined),
};
