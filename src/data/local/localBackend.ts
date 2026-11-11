import { DEFAULT_SETTINGS, newId, nowIso } from '../defaults';
import { sessionStore, setRemember } from '../sessionStorage';
import type {
  AuthService,
  Backend,
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
import { avatarDataUrl } from '@/lib/image';
import { hashPassword, LocalStore, type LocalUserDoc } from './localStore';
import type { Checkin, Habit, Note, Profile, Snapshot } from '@/domain/types';

/**
 * Demo backend: same contracts as Supabase, data kept in this browser.
 * Used automatically when no Supabase keys are configured.
 */

const SESSION_KEY = 'ledger.local.session';
const DELETION_GRACE_MS = 7 * 86_400_000;

class LocalAuth implements AuthService {
  private listeners = new Set<(s: Session | null) => void>();

  constructor(private readonly store: LocalStore) {}

  async getSession(): Promise<Session | null> {
    const raw = sessionStore.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    try {
      const doc = this.store.read(session.userId);
      if (doc.deletionRequestedAt && Date.now() - Date.parse(doc.deletionRequestedAt) > DELETION_GRACE_MS) {
        this.store.delete(doc.id);
        sessionStore.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      sessionStore.removeItem(SESSION_KEY);
      return null;
    }
  }

  onSessionChange(listener: (s: Session | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async signUp(input: SignUpInput): Promise<{ needsConfirmation: boolean }> {
    if (this.store.userIdByEmail(input.email)) throw new Error('An account with this email already exists.');
    const doc: LocalUserDoc = {
      id: newId(),
      email: input.email.trim().toLowerCase(),
      passwordHash: await hashPassword(input.password),
      createdAt: nowIso(),
      settings: { ...DEFAULT_SETTINGS, name: input.name.trim(), timezone: input.timezone },
      avatarUrl: null,
      onboarded: false,
      lastExportAt: null,
      deletionRequestedAt: null,
      habits: [],
      checkins: [],
      notes: [],
    };
    this.store.write(doc);
    return { needsConfirmation: false };
  }

  async signIn({ email, password, remember }: SignInInput): Promise<void> {
    const id = this.store.userIdByEmail(email.trim());
    const doc = id ? this.store.read(id) : null;
    if (!doc || doc.passwordHash !== (await hashPassword(password))) throw new Error('Email or password is incorrect.');
    setRemember(remember);
    this.setSession({ userId: doc.id, email: doc.email });
  }

  async signOut(): Promise<void> {
    sessionStore.removeItem(SESSION_KEY);
    this.emit(null);
  }

  async requestPasswordReset(): Promise<void> {
    // Demo mode cannot send email; the UI shows the same confirmation either way.
  }

  async updatePassword(password: string): Promise<void> {
    const session = await this.requireSession();
    const passwordHash = await hashPassword(password);
    this.store.update(session.userId, (d) => ({ ...d, passwordHash }));
  }

  async changeEmail(email: string): Promise<{ needsConfirmation: boolean }> {
    const session = await this.requireSession();
    if (this.store.userIdByEmail(email)) throw new Error('That email is already in use.');
    const doc = this.store.read(session.userId);
    this.store.delete(doc.id);
    this.store.write({ ...doc, email: email.trim().toLowerCase() });
    this.setSession({ userId: doc.id, email: email.trim().toLowerCase() });
    return { needsConfirmation: false };
  }

  private async requireSession(): Promise<Session> {
    const session = await this.getSession();
    if (!session) throw new Error('You are signed out.');
    return session;
  }

  private setSession(session: Session): void {
    sessionStore.setItem(SESSION_KEY, JSON.stringify(session));
    this.emit(session);
  }

  private emit(session: Session | null): void {
    this.listeners.forEach((l) => l(session));
  }
}

/** Base for repositories that read and write one user's document. */
abstract class LocalRepository {
  constructor(
    protected readonly store: LocalStore,
    protected readonly userId: string,
  ) {}

  protected get doc(): LocalUserDoc {
    return this.store.read(this.userId);
  }

  protected change(fn: (doc: LocalUserDoc) => LocalUserDoc): Promise<void> {
    this.store.update(this.userId, fn);
    return Promise.resolve();
  }
}

class LocalProfiles extends LocalRepository implements ProfileRepository {
  async get(): Promise<Profile> {
    const d = this.doc;
    return {
      ...d.settings,
      id: d.id,
      email: d.email,
      avatarUrl: d.avatarUrl,
      onboarded: d.onboarded,
      lastExportAt: d.lastExportAt,
      createdAt: d.createdAt,
    };
  }

  update({ onboarded, ...settings }: ProfilePatch): Promise<void> {
    return this.change((d) => ({ ...d, onboarded: onboarded ?? d.onboarded, settings: { ...d.settings, ...settings } }));
  }

  async setAvatar(file: File | null): Promise<void> {
    const avatarUrl = file ? await avatarDataUrl(file) : null;
    return this.change((d) => ({ ...d, avatarUrl }));
  }

  markExported(at: string): Promise<void> {
    return this.change((d) => ({ ...d, lastExportAt: at }));
  }

  requestDeletion(): Promise<void> {
    return this.change((d) => ({ ...d, deletionRequestedAt: nowIso() }));
  }

  async cancelDeletion(): Promise<boolean> {
    const pending = !!this.doc.deletionRequestedAt;
    if (pending) await this.change((d) => ({ ...d, deletionRequestedAt: null }));
    return pending;
  }
}

class LocalHabits extends LocalRepository implements HabitRepository {
  async list(): Promise<Habit[]> {
    return this.doc.habits;
  }

  save(habit: Habit): Promise<void> {
    return this.change((d) => ({ ...d, habits: [...d.habits.filter((h) => h.id !== habit.id), habit] }));
  }

  remove(id: string): Promise<void> {
    return this.change((d) => ({
      ...d,
      habits: d.habits.filter((h) => h.id !== id),
      checkins: d.checkins.filter((c) => c.habitId !== id),
      notes: d.notes.filter((n) => n.habitId !== id),
    }));
  }

  reorder(ids: string[]): Promise<void> {
    return this.change((d) => ({ ...d, habits: d.habits.map((h) => ({ ...h, order: ids.indexOf(h.id) })) }));
  }
}

class LocalCheckins extends LocalRepository implements CheckinRepository {
  async list(): Promise<Checkin[]> {
    return this.doc.checkins;
  }

  set(checkin: Checkin, done: boolean): Promise<void> {
    const same = (c: Checkin) => c.habitId === checkin.habitId && c.date === checkin.date;
    return this.change((d) => ({ ...d, checkins: [...d.checkins.filter((c) => !same(c)), ...(done ? [checkin] : [])] }));
  }
}

class LocalNotes extends LocalRepository implements NoteRepository {
  async list(): Promise<Note[]> {
    return this.doc.notes;
  }

  add(note: Note): Promise<void> {
    return this.change((d) => ({ ...d, notes: [...d.notes, note] }));
  }

  remove(id: string): Promise<void> {
    return this.change((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }));
  }
}

class LocalSnapshots extends LocalRepository implements SnapshotRepository {
  async load(): Promise<Snapshot> {
    const d = this.doc;
    return { profile: d.settings, habits: d.habits, checkins: d.checkins, notes: d.notes };
  }

  replace(s: Snapshot): Promise<void> {
    return this.change((d) => ({ ...d, settings: s.profile, habits: s.habits, checkins: s.checkins, notes: s.notes }));
  }
}

export function createLocalBackend(store = new LocalStore()): Backend {
  return {
    kind: 'local',
    capabilities: { globalSignOut: false, deletionGraceDays: 7 },
    auth: new LocalAuth(store),
    repositoriesFor(session: Session): Repositories {
      return {
        profiles: new LocalProfiles(store, session.userId),
        habits: new LocalHabits(store, session.userId),
        checkins: new LocalCheckins(store, session.userId),
        notes: new LocalNotes(store, session.userId),
        snapshots: new LocalSnapshots(store, session.userId),
      };
    },
  };
}
