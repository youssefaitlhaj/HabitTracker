/**
 * Whether this browser tab is in the demo. Opening /demo starts it (with fresh sample data);
 * it then lasts for the tab, across reloads, until the visitor exits it.
 * The backend is chosen once at start-up, so entering and leaving reload the page.
 */

export const DEMO_PATH = '/demo';
const FLAG = 'ledger.demo.active';

function tabStorage(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

export function demoRequested(path: string, storage: Storage | null = tabStorage()): { active: boolean; fresh: boolean } {
  const fresh = path === DEMO_PATH;
  try {
    if (fresh) storage?.setItem(FLAG, '1');
    return { active: fresh || storage?.getItem(FLAG) === '1', fresh };
  } catch {
    return { active: fresh, fresh };
  }
}

const go = (url: string) => window.location.assign(url);

/** Back to a fresh copy of the sample data. */
export function restartDemo(): void {
  go(DEMO_PATH);
}

/** Ends the demo in this tab and opens the log-in page of the real app. */
export function leaveDemo(storage: Storage | null = tabStorage()): void {
  try {
    storage?.removeItem(FLAG);
  } catch {
    // nothing stored, nothing to remove
  }
  go('/login');
}
