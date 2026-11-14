import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

/**
 * Runs firestore.rules in the Firebase emulator (npm run test:rules).
 * Covers the exact reads and writes the app makes, including whole-collection lists.
 */

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'ledger-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/sam'), { name: 'Sam' });
    await setDoc(doc(db, 'users/sam/habits/h1'), { id: 'h1', name: 'Walk' });
    await setDoc(doc(db, 'users/sam/taskMonths/2026-11'), { items: [] });
    await setDoc(doc(db, 'users/sam/devices/d1'), { subscription: {} });
  });
});

const confirmed = () => env.authenticatedContext('sam', { email_verified: true }).firestore();
const unconfirmed = () => env.authenticatedContext('sam', { email_verified: false }).firestore();
const stranger = () => env.authenticatedContext('alex', { email_verified: true }).firestore();

describe('firestore.rules', () => {
  it('lets a confirmed user list and write their own habits, task months and devices', async () => {
    const db = confirmed();
    await assertSucceeds(getDocs(collection(db, 'users/sam/habits')));
    await assertSucceeds(getDocs(collection(db, 'users/sam/taskMonths')));
    await assertSucceeds(getDocs(collection(db, 'users/sam/devices')));
    await assertSucceeds(setDoc(doc(db, 'users/sam/taskMonths/2026-12'), { items: [] }));
    await assertSucceeds(setDoc(doc(db, 'users/sam/habits/h2'), { id: 'h2', name: 'Read' }));
  });

  it('rejects malformed task month ids and habits whose id does not match', async () => {
    const db = confirmed();
    await assertFails(setDoc(doc(db, 'users/sam/taskMonths/not-a-month'), { items: [] }));
    await assertFails(setDoc(doc(db, 'users/sam/habits/h3'), { id: 'other', name: 'Read' }));
  });

  it('keeps other people and unconfirmed accounts out', async () => {
    await assertFails(getDocs(collection(stranger(), 'users/sam/taskMonths')));
    await assertFails(getDocs(collection(stranger(), 'users/sam/habits')));
    await assertFails(getDocs(collection(unconfirmed(), 'users/sam/habits')));
  });

  it('allows creating your own profile before the email is confirmed (sign-up)', async () => {
    await assertSucceeds(setDoc(doc(env.authenticatedContext('new', { email_verified: false }).firestore(), 'users/new'), { name: 'New' }));
  });
});
