import { initializeApp } from 'firebase/app';
import {
  applyActionCode,
  browserLocalPersistence,
  confirmPasswordReset,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyPasswordResetCode,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  verifyBeforeUpdateEmail,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { DEFAULT_SETTINGS, nowIso } from '../defaults';
import type {
  AuthService,
  Backend,
  EmailActionService,
  CheckinRepository,
  HabitRepository,
  NoteRepository,
  ProfilePatch,
  ProfileRepository,
  Repositories,
  Session,
  SignInInput,
  SignUpInput,
  SnapshotRepository,
} from '../ports';
import { friendly } from './errors';
import { detectTimeZone } from '@/domain/date';
import type { Checkin, Habit, Note, Profile, ProfileSettings, Snapshot } from '@/domain/types';
import { avatarDataUrl } from '@/lib/image';

/**
 * Firebase backend (free Spark plan): Firebase Auth + Cloud Firestore.
 *
 * Layout: users/{uid} holds the profile; users/{uid}/habits/{habitId} holds one habit together
 * with its check-in dates and notes. Deleting a habit therefore removes its history in one go,
 * and an import is a single atomic batch (design §8.7).
 */

export interface FirebaseSettings {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

interface ProfileDoc extends ProfileSettings {
  avatarUrl: string | null;
  onboarded: boolean;
  lastExportAt: string | null;
  createdAt: string;
}

type StoredNote = Omit<Note, 'habitId'>;

interface HabitDoc extends Habit {
  checkins?: string[];
  notes?: StoredNote[];
}

const MAX_BATCH_WRITES = 500;
const RECENT_LOGIN_MS = 5 * 60_000;
const continueUrl = () => ({ url: `${window.location.origin}/login` });

/** Only users who confirmed their email count as signed in (design §8.1). */
const toSession = (user: User | null): Session | null =>
  user?.emailVerified ? { userId: user.uid, email: user.email ?? '' } : null;

function newProfile(name: string, timezone: string): ProfileDoc {
  return { ...DEFAULT_SETTINGS, name, timezone, avatarUrl: null, onboarded: false, lastExportAt: null, createdAt: nowIso() };
}

/** The habit fields only, so saving a habit never overwrites its check-ins or notes. */
function habitFields(h: Habit): Habit {
  const { id, name, category, color, reminder, startDate, why, order, schedules, pauses, createdAt, updatedAt } = h;
  return { id, name, category, color, reminder, startDate, why, order, schedules, pauses, createdAt, updatedAt };
}

class FirebaseAuthService implements AuthService {
  constructor(
    private readonly auth: Auth,
    private readonly db: Firestore,
  ) {}

  async getSession(): Promise<Session | null> {
    await this.auth.authStateReady();
    return toSession(this.auth.currentUser);
  }

  onSessionChange(listener: (s: Session | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) => listener(toSession(user)));
  }

  async signUp({ name, email, password, timezone }: SignUpInput): Promise<{ needsConfirmation: boolean }> {
    const { user } = await friendly(createUserWithEmailAndPassword(this.auth, email, password));
    await friendly(setDoc(doc(this.db, 'users', user.uid), newProfile(name, timezone)));
    await friendly(sendEmailVerification(user, continueUrl()));
    await signOut(this.auth);
    return { needsConfirmation: true };
  }

  async signIn({ email, password, remember }: SignInInput): Promise<void> {
    await setPersistence(this.auth, remember ? browserLocalPersistence : browserSessionPersistence);
    const { user } = await friendly(signInWithEmailAndPassword(this.auth, email, password));
    if (!user.emailVerified) {
      await friendly(sendEmailVerification(user, continueUrl()));
      await signOut(this.auth);
      throw new Error('Please confirm your email first. We just sent you a new link.');
    }
  }

  async signOut(): Promise<void> {
    await friendly(signOut(this.auth));
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email, continueUrl());
    } catch {
      // Same answer whether or not the email has an account, so nobody can probe for accounts.
    }
  }

  async updatePassword(password: string): Promise<void> {
    await friendly(updatePassword(this.currentUser(), password));
  }

  async changePassword(current: string, next: string): Promise<void> {
    const user = this.currentUser();
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? '', current));
    } catch {
      throw new Error('Your current password is incorrect.');
    }
    await friendly(updatePassword(user, next));
  }

  async changeEmail(email: string): Promise<{ needsConfirmation: boolean }> {
    await friendly(verifyBeforeUpdateEmail(this.currentUser(), email, continueUrl()));
    return { needsConfirmation: true };
  }

  private currentUser(): User {
    if (!this.auth.currentUser) throw new Error('You are signed out. Log in and try again.');
    return this.auth.currentUser;
  }
}

/** Handles the links in Firebase's emails on Ledger's own /auth/action page. */
class FirebaseEmailActions implements EmailActionService {
  constructor(private readonly auth: Auth) {}

  checkResetCode(code: string): Promise<string> {
    return friendly(verifyPasswordResetCode(this.auth, code));
  }

  confirmPasswordReset(code: string, password: string): Promise<void> {
    return friendly(confirmPasswordReset(this.auth, code, password));
  }

  applyCode(code: string): Promise<void> {
    return friendly(applyActionCode(this.auth, code));
  }
}

/** Shared paths and reads for one signed-in user. */
class UserData {
  constructor(
    readonly db: Firestore,
    readonly auth: Auth,
    readonly uid: string,
  ) {}

  get profileRef() {
    return doc(this.db, 'users', this.uid);
  }

  habitRef(id: string) {
    return doc(this.db, 'users', this.uid, 'habits', id);
  }

  async habitDocs(): Promise<HabitDoc[]> {
    const snap = await friendly(getDocs(collection(this.db, 'users', this.uid, 'habits')));
    return snap.docs.map((d) => d.data() as HabitDoc);
  }

  async profileDoc(): Promise<ProfileDoc> {
    const snap = await friendly(getDoc(this.profileRef));
    if (snap.exists()) return snap.data() as ProfileDoc;
    const created = newProfile(this.auth.currentUser?.displayName ?? '', detectTimeZone());
    await friendly(setDoc(this.profileRef, created));
    return created;
  }
}

abstract class FirebaseRepository {
  constructor(protected readonly data: UserData) {}
}

class FirebaseProfiles extends FirebaseRepository implements ProfileRepository {
  async get(): Promise<Profile> {
    const p = await this.data.profileDoc();
    return { ...p, id: this.data.uid, email: this.data.auth.currentUser?.email ?? '' };
  }

  async update({ onboarded, ...settings }: ProfilePatch): Promise<void> {
    await friendly(updateDoc(this.data.profileRef, { ...settings, ...(onboarded ? { onboarded: true } : {}) }));
  }

  async setAvatar(file: File | null): Promise<void> {
    await friendly(updateDoc(this.data.profileRef, { avatarUrl: file ? await avatarDataUrl(file) : null }));
  }

  async markExported(at: string): Promise<void> {
    await friendly(updateDoc(this.data.profileRef, { lastExportAt: at }));
  }

  /** Free Firebase has no scheduled jobs, so deletion happens at once (capabilities.deletionGraceDays = 0). */
  async requestDeletion(): Promise<void> {
    const user = this.data.auth.currentUser;
    if (!user) throw new Error('You are signed out. Log in and try again.');
    const lastLogin = Date.parse(user.metadata.lastSignInTime ?? '');
    if (!(Date.now() - lastLogin < RECENT_LOGIN_MS)) {
      throw new Error('For your security, log out and log in again, then delete your account within 5 minutes.');
    }
    const batch = writeBatch(this.data.db);
    for (const h of await this.data.habitDocs()) batch.delete(this.data.habitRef(h.id));
    batch.delete(this.data.profileRef);
    await friendly(batch.commit());
    await friendly(deleteUser(user));
  }

  async cancelDeletion(): Promise<boolean> {
    return false;
  }
}

class FirebaseHabits extends FirebaseRepository implements HabitRepository {
  async list(): Promise<Habit[]> {
    return (await this.data.habitDocs()).map(habitFields);
  }

  async save(habit: Habit): Promise<void> {
    await friendly(setDoc(this.data.habitRef(habit.id), habitFields(habit), { merge: true }));
  }

  async remove(id: string): Promise<void> {
    await friendly(deleteDoc(this.data.habitRef(id)));
  }

  async reorder(ids: string[]): Promise<void> {
    const batch = writeBatch(this.data.db);
    ids.forEach((id, order) => batch.update(this.data.habitRef(id), { order }));
    await friendly(batch.commit());
  }
}

class FirebaseCheckins extends FirebaseRepository implements CheckinRepository {
  async list(): Promise<Checkin[]> {
    return (await this.data.habitDocs()).flatMap((h) => (h.checkins ?? []).map((date) => ({ habitId: h.id, date })));
  }

  async set({ habitId, date }: Checkin, done: boolean): Promise<void> {
    await friendly(updateDoc(this.data.habitRef(habitId), { checkins: done ? arrayUnion(date) : arrayRemove(date) }));
  }
}

class FirebaseNotes extends FirebaseRepository implements NoteRepository {
  async list(): Promise<Note[]> {
    return (await this.data.habitDocs()).flatMap((h) => (h.notes ?? []).map((n) => ({ ...n, habitId: h.id })));
  }

  async add({ habitId, ...note }: Note): Promise<void> {
    await friendly(updateDoc(this.data.habitRef(habitId), { notes: arrayUnion(note) }));
  }

  async remove(id: string): Promise<void> {
    for (const h of await this.data.habitDocs()) {
      const note = (h.notes ?? []).find((n) => n.id === id);
      if (note) return void (await friendly(updateDoc(this.data.habitRef(h.id), { notes: arrayRemove(note) })));
    }
  }
}

class FirebaseSnapshots extends FirebaseRepository implements SnapshotRepository {
  async load(): Promise<Snapshot> {
    const [profile, habits] = await Promise.all([this.data.profileDoc(), this.data.habitDocs()]);
    const { name, timezone, weekStart, defaultRestDays, showStreaks, celebrate } = profile;
    return {
      profile: { name, timezone, weekStart, defaultRestDays, showStreaks, celebrate },
      habits: habits.map(habitFields),
      checkins: habits.flatMap((h) => (h.checkins ?? []).map((date) => ({ habitId: h.id, date }))),
      notes: habits.flatMap((h) => (h.notes ?? []).map((n) => ({ ...n, habitId: h.id }))),
    };
  }

  /** One atomic batch: everything is replaced, or nothing changes. */
  async replace(snapshot: Snapshot): Promise<void> {
    const existing = await this.data.habitDocs();
    if (existing.length + snapshot.habits.length + 1 > MAX_BATCH_WRITES) {
      throw new Error('That is too many habits to import in one go.');
    }
    const batch = writeBatch(this.data.db);
    existing.forEach((h) => batch.delete(this.data.habitRef(h.id)));
    for (const habit of snapshot.habits) {
      const docData: HabitDoc = {
        ...habitFields(habit),
        checkins: snapshot.checkins.filter((c) => c.habitId === habit.id).map((c) => c.date),
        notes: snapshot.notes.filter((n) => n.habitId === habit.id).map(({ habitId: _h, ...n }) => n),
      };
      batch.set(this.data.habitRef(habit.id), docData);
    }
    batch.update(this.data.profileRef, { ...snapshot.profile });
    await friendly(batch.commit());
  }
}

export function createFirebaseBackend(settings: FirebaseSettings): Backend {
  const app = initializeApp(settings);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  return {
    kind: 'firebase',
    capabilities: { globalSignOut: false, deletionGraceDays: 0 },
    auth: new FirebaseAuthService(auth, db),
    emailActions: new FirebaseEmailActions(auth),
    repositoriesFor(session: Session): Repositories {
      const data = new UserData(db, auth, session.userId);
      return {
        profiles: new FirebaseProfiles(data),
        habits: new FirebaseHabits(data),
        checkins: new FirebaseCheckins(data),
        notes: new FirebaseNotes(data),
        snapshots: new FirebaseSnapshots(data),
      };
    },
  };
}
