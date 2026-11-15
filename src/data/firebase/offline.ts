import type { FirebaseApp } from 'firebase/app';
import {
  clearIndexedDbPersistence,
  getDoc,
  getDocFromCache,
  getDocs,
  getDocsFromCache,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';
import { friendly } from './errors';

/**
 * Offline use: Firestore keeps a copy of the user's data on the device (persistentLocalCache).
 * These helpers make the app use that copy straight away when there's no connection, instead of
 * waiting for the server.
 */

/**
 * The Firestore instance with its on-device copy. Signing out or deleting the account wipes that
 * copy, so the next person using the device can't read it, and starts a fresh instance.
 */
export class FirestoreStore {
  private current: Firestore;

  constructor(private readonly app: FirebaseApp) {
    this.current = this.open();
  }

  get db(): Firestore {
    return this.current;
  }

  async wipe(): Promise<void> {
    await terminate(this.current);
    try {
      await clearIndexedDbPersistence(this.current);
    } catch (error) {
      // Fails while another Ledger tab still has the data open; the copy then stays until a later sign-out.
      console.error('[Ledger] Couldn’t remove the offline copy from this device:', error);
    }
    this.current = this.open();
  }

  private open(): Firestore {
    return initializeFirestore(this.app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  }
}

export const isOffline = (): boolean => typeof navigator !== 'undefined' && navigator.onLine === false;

/** Online: the server's version. Offline: the copy on this device. */
export function readDoc<T extends DocumentData>(ref: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
  return friendly(isOffline() ? getDocFromCache(ref) : getDoc(ref));
}

export function readDocs<T extends DocumentData>(query: Query<T>): Promise<QuerySnapshot<T>> {
  return friendly(isOffline() ? getDocsFromCache(query) : getDocs(query));
}

/**
 * Online: resolves once the server has the change. Offline: Firestore has already applied it on
 * this device and sends it when the connection is back, so the app doesn't wait for that.
 */
export function save(write: Promise<void>): Promise<void> {
  if (!isOffline()) return friendly(write);
  write.catch((error) => console.error('[Ledger] A change made offline could not be synced:', error));
  return Promise.resolve();
}

/** For actions that only make sense online (import, account deletion, reminders). */
export function requireConnection(): void {
  if (isOffline()) throw new Error('You’re offline. Connect to the internet and try again.');
}
