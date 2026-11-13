import { screen } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

/** Shared steps for end-to-end tests that drive the real screens. */

export const TEST_PASSWORD = 'Whisky&Oat1';

type User = ReturnType<typeof userEvent.setup>;

export function resetBrowser(path = '/'): void {
  localStorage.clear();
  sessionStorage.clear();
  window.history.pushState({}, '', path);
}

export async function signUp(user: User): Promise<void> {
  await user.click(await screen.findByRole('link', { name: 'Sign up' }));
  await user.type(screen.getByLabelText('Name'), 'Sam');
  await user.type(screen.getByLabelText('Email'), 'sam@example.com');
  await user.type(screen.getByLabelText('Password'), TEST_PASSWORD);
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

export async function signUpAndSkipSetup(user: User): Promise<void> {
  await signUp(user);
  await user.click(await screen.findByRole('button', { name: 'Skip setup' }));
}

export async function openSettings(user: User, tab: string): Promise<void> {
  await user.click((await screen.findAllByRole('link', { name: /Settings/ }))[0]!);
  await user.click(await screen.findByRole('link', { name: tab }));
}
