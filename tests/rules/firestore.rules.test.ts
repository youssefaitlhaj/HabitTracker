import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
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
    await setDoc(doc(db, 'admins/sam'), {});
    await setDoc(doc(db, 'demoFeedback/f1'), { text: 'Nice', createdAt: new Date(), notified: false });
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

  describe('demo feedback', () => {
    const visitor = () => env.unauthenticatedContext().firestore();
    const feedback = (extra: object = {}) => ({ text: 'Loved the charts', createdAt: serverTimestamp(), notified: false, ...extra });
    // What the admin tab does: newest first, up to 500.
    const newest = (db: ReturnType<typeof visitor>) => getDocs(query(collection(db, 'demoFeedback'), orderBy('createdAt', 'desc'), limit(500)));

    it('lets a visitor without an account send text with the server time', async () => {
      await assertSucceeds(addDoc(collection(visitor(), 'demoFeedback'), feedback()));
    });

    it('rejects anything else: extra fields, empty or long text, a made-up time, notified = true', async () => {
      const db = visitor();
      await assertFails(addDoc(collection(db, 'demoFeedback'), feedback({ email: 'a@b.c' })));
      await assertFails(addDoc(collection(db, 'demoFeedback'), feedback({ text: '' })));
      await assertFails(addDoc(collection(db, 'demoFeedback'), feedback({ text: 'x'.repeat(1001) })));
      await assertFails(addDoc(collection(db, 'demoFeedback'), feedback({ createdAt: new Date('2020-01-01') })));
      await assertFails(addDoc(collection(db, 'demoFeedback'), feedback({ notified: true })));
    });

    it('lets only admins read it, and nobody change or delete it', async () => {
      await assertSucceeds(newest(confirmed()));
      await assertFails(newest(stranger()));
      await assertFails(newest(unconfirmed()));
      await assertFails(newest(visitor()));
      await assertFails(updateDoc(doc(confirmed(), 'demoFeedback/f1'), { notified: true }));
      await assertFails(deleteDoc(doc(confirmed(), 'demoFeedback/f1')));
    });

    it('lets people check whether they are an admin, but not make themselves one', async () => {
      await assertSucceeds(getDoc(doc(confirmed(), 'admins/sam')));
      await assertSucceeds(getDoc(doc(stranger(), 'admins/alex')));
      await assertFails(getDoc(doc(stranger(), 'admins/sam')));
      await assertFails(setDoc(doc(stranger(), 'admins/alex'), {}));
    });
  });
});
