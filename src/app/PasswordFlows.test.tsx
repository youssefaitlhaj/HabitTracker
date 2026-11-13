import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalBackend } from '@/data/local/localBackend';
import { LocalStore } from '@/data/local/localStore';
import type { Backend, EmailActionService } from '@/data/ports';
import { openSettings, resetBrowser, signUpAndSkipSetup, TEST_PASSWORD } from '@/test/appFlows';
import { App } from './App';

/** Password change (signed in) and reset-from-email-link, through the real screens. */

function backend(emailActions?: EmailActionService): Backend {
  return { ...createLocalBackend(new LocalStore(localStorage)), emailActions };
}

describe('password flows', () => {
  beforeEach(() => resetBrowser());

  it('changes the password only with the right current password and a matching confirmation', async () => {
    const user = userEvent.setup();
    render(<App backend={backend()} />);
    await signUpAndSkipSetup(user);
    await openSettings(user, 'Account');

    await user.type(screen.getByLabelText('Current password'), 'wrong-password');
    await user.type(screen.getByLabelText('New password'), 'NewWhisky&Oat2');
    await user.type(screen.getByLabelText('Confirm new password'), 'NewWhisky&Oat3');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByText('The passwords don’t match.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Confirm new password'));
    await user.type(screen.getByLabelText('Confirm new password'), 'NewWhisky&Oat2');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Your current password is incorrect.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Current password'));
    await user.type(screen.getByLabelText('Current password'), TEST_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Password changed.')).toBeInTheDocument();
    expect(screen.getByLabelText('Current password')).toHaveValue('');
  });

  it('sets a new password from an email link, then sends you to log in', async () => {
    const actions: EmailActionService = {
      checkResetCode: vi.fn().mockResolvedValue('sam@example.com'),
      confirmPasswordReset: vi.fn().mockResolvedValue(undefined),
      applyCode: vi.fn(),
    };
    resetBrowser('/auth/action?mode=resetPassword&oobCode=abc123');
    const user = userEvent.setup();
    render(<App backend={backend(actions)} />);

    expect(await screen.findByText(/For sam@example.com/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('New password'), 'NewWhisky&Oat2');
    await user.type(screen.getByLabelText('Confirm new password'), 'NewWhisky&Oat2');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(actions.confirmPasswordReset).toHaveBeenCalledWith('abc123', 'NewWhisky&Oat2');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('Password changed. Log in with your new password.')).toBeInTheDocument();
  });

  it('explains when an email link has expired', async () => {
    const actions: EmailActionService = {
      checkResetCode: vi.fn().mockRejectedValue(new Error('This link has expired. Request a new one.')),
      confirmPasswordReset: vi.fn(),
      applyCode: vi.fn(),
    };
    resetBrowser('/auth/action?mode=resetPassword&oobCode=old');
    render(<App backend={backend(actions)} />);
    expect(await screen.findByText(/This link has expired. Request a new one./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Send a new link' })).toHaveAttribute('href', '/reset-password');
  });
});
