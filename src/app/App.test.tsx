import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalBackend } from '@/data/local/localBackend';
import { LocalStore } from '@/data/local/localStore';
import { openSettings, resetBrowser, signUp, signUpAndSkipSetup } from '@/test/appFlows';
import { App } from './App';

/** End-to-end flows through the real screens, using the in-browser demo backend. */

function renderApp() {
  return render(<App backend={createLocalBackend(new LocalStore(localStorage))} />);
}

describe('Ledger app', () => {
  beforeEach(() => resetBrowser());

  it('shows inline errors when signing up with empty fields', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole('link', { name: 'Sign up' }));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Tell us what to call you.')).toBeInTheDocument();
    expect(screen.getByText('Please fix the highlighted fields.')).toBeInTheDocument();
  });

  it('signs up, runs first-run setup, and checks off a habit with undo', async () => {
    const user = userEvent.setup();
    renderApp();
    await signUp(user);

    expect(await screen.findByRole('heading', { name: 'Pick a few habits to start' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Go to Today' }));

    const checkOff = await screen.findByRole('button', { name: 'Check off Morning walk' });
    await user.click(checkOff);
    expect(await screen.findByRole('button', { name: 'Uncheck Morning walk' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Morning walk done.');

    await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('button', { name: 'Check off Morning walk' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('creates a habit through the editor and validates the name', async () => {
    const user = userEvent.setup();
    renderApp();
    await signUpAndSkipSetup(user);

    await user.click((await screen.findAllByRole('button', { name: 'New habit' }))[0]!);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Create habit' }));
    expect(within(dialog).getByText('Give your habit a name.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Name'), 'Practice guitar');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Times a week' }));
    await user.click(within(dialog).getByRole('button', { name: 'Create habit' }));

    expect(await screen.findByRole('heading', { name: 'This week' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practice guitar' })).toBeInTheDocument();
    expect(screen.getByText(/0 of 3 this week/)).toBeInTheDocument();
  });

  it('explains when reminders are not available on this setup', async () => {
    const user = userEvent.setup();
    renderApp();
    await signUpAndSkipSetup(user);
    await openSettings(user, 'Notifications');
    expect(await screen.findByText('Reminders aren’t set up yet')).toBeInTheDocument();
  });
});
