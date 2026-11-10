import type { Checkin, Habit, Note, Profile, ProfileSettings, Snapshot } from '@/domain/types';

/**
 * Ports (interfaces) the app depends on. Screens and hooks only know these;
 * `supabase/` and `local/` provide interchangeable implementations.
 */

export interface Session {
  userId: string;
  email: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  timezone: string;
}

export interface SignInInput {
  email: string;
  password: string;
  remember: boolean;
}

export interface AuthService {
  getSession(): Promise<Session | null>;
  onSessionChange(listener: (session: Session | null) => void): () => void;
  signUp(input: SignUpInput): Promise<{ needsConfirmation: boolean }>;
  signIn(input: SignInInput): Promise<void>;
  signOut(scope?: 'local' | 'global'): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  changeEmail(email: string): Promise<{ needsConfirmation: boolean }>;
}

export type ProfilePatch = Partial<ProfileSettings> & { onboarded?: boolean };

export interface ProfileRepository {
  get(): Promise<Profile>;
  update(patch: ProfilePatch): Promise<void>;
  setAvatar(file: File | null): Promise<void>;
  markExported(at: string): Promise<void>;
  requestDeletion(): Promise<void>;
  /** Clears a pending deletion. Resolves true when one was cancelled. */
  cancelDeletion(): Promise<boolean>;
}

export interface HabitRepository {
  list(): Promise<Habit[]>;
  /** Creates or replaces the whole habit, including its schedule versions and pauses. */
  save(habit: Habit): Promise<void>;
  remove(id: string): Promise<void>;
  reorder(ids: string[]): Promise<void>;
}

export interface CheckinRepository {
  list(): Promise<Checkin[]>;
  set(checkin: Checkin, done: boolean): Promise<void>;
}

export interface NoteRepository {
  list(): Promise<Note[]>;
  add(note: Note): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface SnapshotRepository {
  load(): Promise<Snapshot>;
  /** Atomically replaces all of the user's habits, check-ins, notes and settings. */
  replace(snapshot: Snapshot): Promise<void>;
}

export interface Repositories {
  profiles: ProfileRepository;
  habits: HabitRepository;
  checkins: CheckinRepository;
  notes: NoteRepository;
  snapshots: SnapshotRepository;
}

export interface Backend {
  kind: 'supabase' | 'local';
  auth: AuthService;
  repositoriesFor(session: Session): Repositories;
}
