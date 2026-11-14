import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalBackend } from '@/data/local/localBackend';
import { LocalStore } from '@/data/local/localStore';
import type { Backend } from '@/data/ports';
import { resetBrowser, TEST_PASSWORD } from '@/test/appFlows';
import { App } from './App';

/** A collection that can't load must show an error with Retry, never an endless loading screen. */
describe('when data fails to load', () => {
  beforeEach(() => resetBrowser());

  it('shows what failed and lets you retry', async () => {
    const base = createLocalBackend(new LocalStore(localStorage));
    await base.auth.signUp({ name: 'Sam', email: 'sam@example.com', password: TEST_PASSWORD, timezone: 'UTC' });
    await base.auth.signIn({ email: 'sam@example.com', password: TEST_PASSWORD, remember: true });
    await base.repositoriesFor((await base.auth.getSession())!).profiles.update({ onboarded: true });

    let fail = true;
    const backend: Backend = {
      ...base,
      repositoriesFor(session) {
        const repos = base.repositoriesFor(session);
        const list = repos.tasks.list.bind(repos.tasks);
        return { ...repos, tasks: { ...repos.tasks, list: () => (fail ? Promise.reject(new Error('Missing permission')) : list()) } };
      },
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const user = userEvent.setup();
    render(<App backend={backend} />);
    expect(await screen.findByText('Some of your data couldn’t load', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText(/Missing permission/)).toBeInTheDocument();

    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'To-do' })).toBeInTheDocument();
  });
});
