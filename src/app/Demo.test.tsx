import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBackend } from '@/data/backend';
import { createDemoBackend } from '@/data/demo/demoBackend';
import { demoRequested } from '@/data/demo/demoMode';
import { createLocalBackend } from '@/data/local/localBackend';
import { LocalStore } from '@/data/local/localStore';
import { openSettings, resetBrowser } from '@/test/appFlows';
import { App } from './App';

/** The sample-data demo (/demo): no account, realistic data, account features labelled. */

function renderDemo(onExit = vi.fn()) {
  render(<App backend={createDemoBackend({ fresh: true, onExit, timezone: 'UTC' })} />);
  return onExit;
}

const section = (name: string) => screen.getByRole('region', { name });

describe('demo', () => {
  beforeEach(() => resetBrowser('/demo'));

  it('starts from /demo and stays on for the tab after a reload', () => {
    expect(demoRequested('/demo', sessionStorage)).toEqual({ active: true, fresh: true });
    expect(demoRequested('/tasks', sessionStorage)).toEqual({ active: true, fresh: false });
    sessionStorage.clear();
    expect(demoRequested('/tasks', sessionStorage)).toEqual({ active: false, fresh: false });
  });

  it('is picked over the configured backend on /demo', async () => {
    const backend = await createBackend({ VITE_FIREBASE_API_KEY: 'k', VITE_FIREBASE_PROJECT_ID: 'p' } as ImportMetaEnv, '/demo');
    expect(backend.kind).toBe('demo');
  });

  it('opens straight on Today with sample habits, tasks and the demo strip', async () => {
    renderDemo();
    expect(await screen.findByRole('button', { name: /Read 20 pages/ })).toBeInTheDocument();
    expect(screen.getAllByText('Dentist appointment').length).toBeGreaterThan(0);
    expect(screen.getByText(/exploring Ledger with sample data/)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('keeps changes in the tab and starts over from the sample data', async () => {
    const user = userEvent.setup();
    renderDemo();
    await user.click(await screen.findByRole('button', { name: 'Check off Read 20 pages' }));
    expect(await screen.findByRole('button', { name: 'Uncheck Read 20 pages' })).toBeInTheDocument();

    const session = { userId: 'demo', email: 'sam@example.com' };
    const readToday = async (fresh: boolean) => {
      const backend = createDemoBackend({ fresh, onExit: vi.fn(), timezone: 'UTC' });
      const [habits, checkins] = await Promise.all([backend.repositoriesFor(session).habits.list(), backend.repositoriesFor(session).checkins.list()]);
      const read = habits.find((h) => h.name === 'Read 20 pages')!;
      return checkins.some((c) => c.habitId === read.id && c.date === new Date().toISOString().slice(0, 10));
    };
    expect(await readToday(false)).toBe(true); // a reload keeps it
    expect(await readToday(true)).toBe(false); // "Start over" doesn't
  });

  it('labels account features "Not in the demo" and disables them', async () => {
    const user = userEvent.setup();
    const onExit = renderDemo();

    await openSettings(user, 'Account');
    for (const name of ['Password', 'Delete account']) {
      expect(within(section(name)).getByText('Not in the demo')).toBeInTheDocument();
    }
    expect(within(section('Password')).getByRole('button', { name: 'Change password' })).toBeDisabled();
    await user.click(within(section('Demo')).getByRole('button', { name: 'Exit demo' }));
    expect(onExit).toHaveBeenCalled();

    await user.click(screen.getByRole('link', { name: 'Notifications' }));
    expect(within(section('Notifications')).getByText('Not in the demo')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Reminders on this device' })).toBeDisabled();

    await user.click(screen.getByRole('link', { name: 'Profile' }));
    expect(await screen.findByLabelText('Email')).toBeDisabled();
    expect(screen.getByLabelText('Display name')).toBeEnabled();
  });

  it('is offered on the log-in page', async () => {
    resetBrowser('/login');
    render(<App backend={createLocalBackend(new LocalStore(localStorage))} />);
    expect(await screen.findByRole('link', { name: 'Try the demo' })).toHaveAttribute('href', '/demo');
  });
});
