import { FirebaseError } from 'firebase/app';

/** Turns Firebase error codes into sentences people can act on. */
const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email, like name@example.com.',
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in.',
  'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'You seem to be offline. Check your connection and try again.',
  'auth/requires-recent-login': 'For your security, log out and log in again, then repeat this.',
  'auth/expired-action-code': 'This link has expired. Request a new one.',
  'auth/invalid-action-code': 'This link has expired or was already used. Request a new one.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/unauthorized-continue-uri': 'This site is not on the Firebase authorized domains list yet.',
  'permission-denied': 'You don’t have access to that. Try logging in again.',
  unavailable: 'The database is not reachable right now. Try again in a moment.',
};

export function friendlyError(error: unknown): Error {
  if (error instanceof FirebaseError) return new Error(MESSAGES[error.code] ?? 'Something went wrong. Please try again.', { cause: error });
  return error instanceof Error ? error : new Error('Something went wrong. Please try again.');
}

/** Runs a Firebase call and rethrows any failure as a friendly Error. */
export async function friendly<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    throw friendlyError(error);
  }
}
