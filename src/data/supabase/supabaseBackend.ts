import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AVATAR_MAX_BYTES } from '../defaults';
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
  TaskRepository,
} from '../ports';
import {
  checkinFromRow,
  HABIT_SELECT,
  habitFromRow,
  noteFromRow,
  profileFromRow,
  profilePatchToRow,
  settingsFromRow,
  taskFromRow,
  taskToRow,
  type HabitRow,
  type ProfileRow,
  type TaskRow,
} from './mappers';
import type { Checkin, Habit, Note, Profile, Snapshot, Task } from '@/domain/types';

interface SupabaseResult<T> {
  data?: T | null;
  error: { message: string } | null;
}

/** Throws the Supabase error, if any. */
function check(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(result.error.message);
}

/** Throws the Supabase error (if any) and returns the data otherwise. */
function unwrap<T>(result: SupabaseResult<T>): T {
  check(result);
  return result.data as T;
}

const toSession = (user: { id: string; email?: string } | null | undefined): Session | null =>
  user ? { userId: user.id, email: user.email ?? '' } : null;

class SupabaseAuth implements AuthService {
  constructor(private readonly db: SupabaseClient) {}

  async getSession(): Promise<Session | null> {
    const { data } = await this.db.auth.getSession();
    return toSession(data.session?.user);
  }

  onSessionChange(listener: (s: Session | null) => void): () => void {
    const { data } = this.db.auth.onAuthStateChange((_event, session) => listener(toSession(session?.user)));
    return () => data.subscription.unsubscribe();
  }

  async signUp({ name, email, password, timezone }: SignUpInput): Promise<{ needsConfirmation: boolean }> {
    const data = unwrap(
      await this.db.auth.signUp({
        email,
        password,
        options: { data: { name, timezone }, emailRedirectTo: `${window.location.origin}/login` },
      }),
    );
    return { needsConfirmation: !data.session };
  }

  async signIn({ email, password, remember }: SignInInput): Promise<void> {
    setRemember(remember);
    check(await this.db.auth.signInWithPassword({ email, password }));
  }

  async signOut(scope: 'local' | 'global' = 'local'): Promise<void> {
    check(await this.db.auth.signOut({ scope }));
  }

  async requestPasswordReset(email: string): Promise<void> {
    check(await this.db.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/update-password` }));
  }

  async updatePassword(password: string): Promise<void> {
    check(await this.db.auth.updateUser({ password }));
  }

  async changePassword(current: string, next: string): Promise<void> {
    const { data } = await this.db.auth.getUser();
    const verified = await this.db.auth.signInWithPassword({ email: data.user?.email ?? '', password: current });
    if (verified.error) throw new Error('Your current password is incorrect.');
    await this.updatePassword(next);
  }

  async changeEmail(email: string): Promise<{ needsConfirmation: boolean }> {
    check(await this.db.auth.updateUser({ email }));
    return { needsConfirmation: true };
  }
}

abstract class SupabaseRepository {
  constructor(
    protected readonly db: SupabaseClient,
    protected readonly session: Session,
  ) {}
}

class SupabaseProfiles extends SupabaseRepository implements ProfileRepository {
  async get(): Promise<Profile> {
    const row = unwrap(await this.db.from('profiles').select('*').eq('id', this.session.userId).single<ProfileRow>());
    const avatarUrl = row.avatar_path
      ? (await this.db.storage.from('avatars').createSignedUrl(row.avatar_path, 3600)).data?.signedUrl ?? null
      : null;
    return profileFromRow(row, this.session.email, avatarUrl);
  }

  async update(patch: ProfilePatch): Promise<void> {
    unwrap(await this.db.from('profiles').update(profilePatchToRow(patch)).eq('id', this.session.userId));
  }

  async setAvatar(file: File | null): Promise<void> {
    if (file && file.size > AVATAR_MAX_BYTES) throw new Error('Pick an image under 2 MB.');
    const current = unwrap(
      await this.db.from('profiles').select('avatar_path').eq('id', this.session.userId).single<{ avatar_path: string | null }>(),
    );
    let path: string | null = null;
    if (file) {
      path = `${this.session.userId}/avatar-${Date.now()}.${file.name.split('.').pop() ?? 'png'}`;
      unwrap(await this.db.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type }));
    }
    unwrap(await this.db.from('profiles').update({ avatar_path: path }).eq('id', this.session.userId));
    if (current.avatar_path) await this.db.storage.from('avatars').remove([current.avatar_path]);
  }

  async markExported(at: string): Promise<void> {
    unwrap(await this.db.from('profiles').update({ last_export_at: at }).eq('id', this.session.userId));
  }

  async requestDeletion(): Promise<void> {
    unwrap(await this.db.rpc('request_account_deletion'));
  }

  async cancelDeletion(): Promise<boolean> {
    return unwrap(await this.db.rpc('cancel_account_deletion')) as boolean;
  }
}

class SupabaseHabits extends SupabaseRepository implements HabitRepository {
  async list(): Promise<Habit[]> {
    return unwrap(await this.db.from('habits').select(HABIT_SELECT).returns<HabitRow[]>()).map(habitFromRow);
  }

  async save(habit: Habit): Promise<void> {
    unwrap(await this.db.rpc('save_habit', { p: habit }));
  }

  async remove(id: string): Promise<void> {
    unwrap(await this.db.from('habits').delete().eq('id', id));
  }

  async reorder(ids: string[]): Promise<void> {
    await Promise.all(ids.map(async (id, order) => unwrap(await this.db.from('habits').update({ sort_order: order }).eq('id', id))));
  }
}

class SupabaseCheckins extends SupabaseRepository implements CheckinRepository {
  async list(): Promise<Checkin[]> {
    return unwrap(await this.db.from('checkins').select('habit_id, date')).map(checkinFromRow);
  }

  async set({ habitId, date }: Checkin, done: boolean): Promise<void> {
    const table = this.db.from('checkins');
    unwrap(
      done
        ? await table.upsert({ habit_id: habitId, date, user_id: this.session.userId }, { ignoreDuplicates: true })
        : await table.delete().eq('habit_id', habitId).eq('date', date),
    );
  }
}

class SupabaseNotes extends SupabaseRepository implements NoteRepository {
  async list(): Promise<Note[]> {
    return unwrap(await this.db.from('notes').select('id, habit_id, date, text, created_at')).map(noteFromRow);
  }

  async add(note: Note): Promise<void> {
    unwrap(
      await this.db.from('notes').insert({
        id: note.id,
        habit_id: note.habitId,
        user_id: this.session.userId,
        date: note.date,
        text: note.text,
        created_at: note.createdAt,
      }),
    );
  }

  async remove(id: string): Promise<void> {
    unwrap(await this.db.from('notes').delete().eq('id', id));
  }
}

class SupabaseTasks extends SupabaseRepository implements TaskRepository {
  async list(): Promise<Task[]> {
    return unwrap(await this.db.from('tasks').select('*').returns<TaskRow[]>()).map(taskFromRow);
  }

  async save(task: Task): Promise<void> {
    unwrap(await this.db.from('tasks').upsert(taskToRow(task, this.session.userId)));
  }

  async remove(task: Task): Promise<void> {
    unwrap(await this.db.from('tasks').delete().eq('id', task.id));
  }
}

class SupabaseSnapshots extends SupabaseRepository implements SnapshotRepository {
  constructor(
    db: SupabaseClient,
    session: Session,
    private readonly parts: { habits: HabitRepository; checkins: CheckinRepository; notes: NoteRepository; tasks: TaskRepository },
  ) {
    super(db, session);
  }

  async load(): Promise<Snapshot> {
    const [row, habits, checkins, notes, tasks] = await Promise.all([
      this.db.from('profiles').select('*').eq('id', this.session.userId).single<ProfileRow>().then(unwrap),
      this.parts.habits.list(),
      this.parts.checkins.list(),
      this.parts.notes.list(),
      this.parts.tasks.list(),
    ]);
    return { profile: settingsFromRow(row), habits, checkins, notes, tasks };
  }

  async replace(snapshot: Snapshot): Promise<void> {
    unwrap(await this.db.rpc('replace_user_data', { p: snapshot }));
  }
}

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const db = createClient(url, anonKey, {
    auth: { storage: sessionStore, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return {
    kind: 'supabase',
    capabilities: { globalSignOut: true, deletionGraceDays: 7 },
    auth: new SupabaseAuth(db),
    repositoriesFor(session: Session): Repositories {
      const habits = new SupabaseHabits(db, session);
      const checkins = new SupabaseCheckins(db, session);
      const notes = new SupabaseNotes(db, session);
      const tasks = new SupabaseTasks(db, session);
      return {
        profiles: new SupabaseProfiles(db, session),
        habits,
        checkins,
        notes,
        tasks,
        snapshots: new SupabaseSnapshots(db, session, { habits, checkins, notes, tasks }),
      };
    },
  };
}
