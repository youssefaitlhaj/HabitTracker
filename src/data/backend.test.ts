import { FirebaseError } from 'firebase/app';
import { describe, expect, it } from 'vitest';
import { createBackend } from './backend';
import { friendlyError } from './firebase/errors';

describe('createBackend', () => {
  it('uses the in-browser demo when no keys are set', async () => {
    const backend = await createBackend({} as ImportMetaEnv);
    expect(backend.kind).toBe('local');
  });

  it('prefers Firebase when its keys are set', async () => {
    const backend = await createBackend({
      VITE_FIREBASE_API_KEY: 'test-key',
      VITE_FIREBASE_PROJECT_ID: 'ledger-test',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon',
    } as ImportMetaEnv);
    expect(backend.kind).toBe('firebase');
    expect(backend.capabilities).toEqual({ globalSignOut: false, deletionGraceDays: 0 });
  });
});

describe('friendlyError', () => {
  it('turns Firebase codes into plain sentences', () => {
    expect(friendlyError(new FirebaseError('auth/invalid-credential', 'x')).message).toBe('Email or password is incorrect.');
    expect(friendlyError(new FirebaseError('auth/some-new-code', 'x')).message).toBe('Something went wrong. Please try again.');
  });
});
