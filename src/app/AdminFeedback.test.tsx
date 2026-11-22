import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalBackend } from '@/data/local/localBackend';
import { LocalStore } from '@/data/local/localStore';
import type { Backend, FeedbackRepository } from '@/data/ports';
import { openSettings, resetBrowser, signUpAndSkipSetup } from '@/test/appFlows';
import { App } from './App';

/** Settings › Demo feedback: only admins see it. */

function renderWith(feedback: FeedbackRepository) {
  const local = createLocalBackend(new LocalStore(localStorage));
  const backend: Backend = { ...local, repositoriesFor: (s) => ({ ...local.repositoriesFor(s), feedback }) };
  render(<App backend={backend} />);
}

const messages = [
  { id: 'f2', text: 'Loved the year heatmap.\nMore colours please!', createdAt: '2026-11-21T09:30:00.000Z' },
  { id: 'f1', text: 'Tasks and habits side by side is handy.', createdAt: '2026-11-20T18:05:00.000Z' },
];

describe('demo feedback for admins', () => {
  beforeEach(() => resetBrowser());

  it('lists the feedback with its time, newest first', async () => {
    const user = userEvent.setup();
    renderWith({ isAdmin: async () => true, list: async () => messages });
    await signUpAndSkipSetup(user);
    await openSettings(user, 'Demo feedback');

    expect(await screen.findByText(/Loved the year heatmap/)).toBeInTheDocument();
    expect(screen.getByText('2 messages from people leaving the demo. Anonymous: only the text and the time are saved.')).toBeInTheDocument();
    const times = screen.getAllByRole('listitem').map((li) => li.querySelector('time')!.getAttribute('dateTime'));
    expect(times).toEqual([messages[0]!.createdAt, messages[1]!.createdAt]);
  });

  it('is hidden from everyone else, even by its address', async () => {
    const user = userEvent.setup();
    renderWith({ isAdmin: async () => false, list: async () => messages });
    await signUpAndSkipSetup(user);
    await openSettings(user, 'Profile');
    expect(screen.queryByRole('link', { name: 'Demo feedback' })).not.toBeInTheDocument();

    window.history.pushState({}, '', '/settings/feedback');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => expect(window.location.pathname).toBe('/settings'));
    expect(screen.queryByText(/Loved the year heatmap/)).not.toBeInTheDocument();
  });
});
