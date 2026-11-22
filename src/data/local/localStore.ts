import type { Checkin, Habit, Note, ProfileSettings, Task } from '@/domain/types';
import { sha256Hex } from '@/lib/hash';

/** Everything the demo backend keeps for one user, stored as JSON in localStorage. */
export interface LocalUserDoc {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  settings: ProfileSettings;
  avatarUrl: string | null;
  onboarded: boolean;
  lastExportAt: string | null;
  deletionRequestedAt: string | null;
  habits: Habit[];
  checkins: Checkin[];
  notes: Note[];
  /** Missing in documents created before daily tasks existed. */
  tasks?: Task[];
}

export class LocalStore {
  /** `prefix` keeps separate stores (the demo's, the local backend's) from overwriting each other. */
  constructor(
    private readonly storage: Storage = localStorage,
    private readonly prefix = 'ledger.local',
  ) {}

  private get usersKey(): string {
    return `${this.prefix}.users`;
  }

  private docKey(id: string): string {
    return `${this.prefix}.user.${id}`;
  }

  /** Removes every account in this store. */
  clear(): void {
    Object.values(this.index()).forEach((id) => this.storage.removeItem(this.docKey(id)));
    this.storage.removeItem(this.usersKey);
  }

  userIdByEmail(email: string): string | null {
    return this.index()[email.toLowerCase()] ?? null;
  }

  read(id: string): LocalUserDoc {
    const raw = this.storage.getItem(this.docKey(id));
    if (!raw) throw new Error('Account not found.');
    return JSON.parse(raw) as LocalUserDoc;
  }

  write(doc: LocalUserDoc): void {
    this.storage.setItem(this.docKey(doc.id), JSON.stringify(doc));
    this.storage.setItem(this.usersKey, JSON.stringify({ ...this.index(), [doc.email.toLowerCase()]: doc.id }));
  }

  update(id: string, change: (doc: LocalUserDoc) => LocalUserDoc): void {
    this.write(change(this.read(id)));
  }

  delete(id: string): void {
    const doc = this.read(id);
    const { [doc.email.toLowerCase()]: _removed, ...rest } = this.index();
    this.storage.setItem(this.usersKey, JSON.stringify(rest));
    this.storage.removeItem(this.docKey(id));
  }

  private index(): Record<string, string> {
    return JSON.parse(this.storage.getItem(this.usersKey) ?? '{}') as Record<string, string>;
  }
}

export function hashPassword(password: string): Promise<string> {
  return sha256Hex(`ledger:${password}`);
}
