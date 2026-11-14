import type { Checkin, Habit, Note, Profile, ProfileSettings, Snapshot, Task } from '@/domain/types';

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
  /** Sets a new password from a reset-link session (no current password needed). */
  updatePassword(password: string): Promise<void>;
  /** Signed-in change: the current password must be right before anything changes. */
  changePassword(current: string, next: string): Promise<void>;
  changeEmail(email: string): Promise<{ needsConfirmation: boolean }>;
}

export type ProfilePatch = Partial<ProfileSettings> & { onboarded?: boolean };

export interface ProfileRepository {
  get(): Promise<Profile>;
  update(patch: ProfilePatch): Promise<void>;
  setAvatar(file: File | null): Promise<void>;
  markExported(at: string): Promise<void>;
  /** Deletes the account now, or schedules it (see BackendCapabilities.deletionGraceDays). */
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

export interface TaskRepository {
  list(): Promise<Task[]>;
  /** Creates or replaces the task. */
  save(task: Task): Promise<void>;
  remove(task: Task): Promise<void>;
}

/** A browser's push subscription, as returned by PushSubscription.toJSON(). */
export interface PushDevice {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface DeviceRepository {
  register(device: PushDevice): Promise<void>;
  unregister(endpoint: string): Promise<void>;
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
  tasks: TaskRepository;
  snapshots: SnapshotRepository;
  /** Present when the backend can send reminder notifications. */
  devices?: DeviceRepository;
}

/** Links in Ledger's emails (reset password, confirm email) that open the app's own page. */
export type EmailActionMode = 'resetPassword' | 'verifyEmail' | 'verifyAndChangeEmail' | 'recoverEmail';

export interface EmailActionService {
  /** Checks a reset link and returns the email it belongs to. */
  checkResetCode(code: string): Promise<string>;
  confirmPasswordReset(code: string, password: string): Promise<void>;
  /** Applies a confirm-email, change-email or restore-email link. */
  applyCode(code: string): Promise<void>;
}

/** What a backend can do, so screens only offer what actually works. */
export interface BackendCapabilities {
  /** Can end sessions on other devices. */
  globalSignOut: boolean;
  /** Days before a deletion request removes the account; 0 means it is removed at once. */
  deletionGraceDays: number;
}

export interface Backend {
  kind: 'firebase' | 'supabase' | 'local';
  capabilities: BackendCapabilities;
  auth: AuthService;
  /** Present when email links come back to the app's /auth/action page. */
  emailActions?: EmailActionService;
  repositoriesFor(session: Session): Repositories;
}
