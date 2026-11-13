import type { Checkin, Habit, Note, ProfileSettings } from '@/domain/types';
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
}

const USERS_KEY = 'ledger.local.users';
const docKey = (id: string) => `ledger.local.user.${id}`;

export class LocalStore {
  constructor(private readonly storage: Storage = localStorage) {}

  userIdByEmail(email: string): string | null {
    return this.index()[email.toLowerCase()] ?? null;
  }

  read(id: string): LocalUserDoc {
    const raw = this.storage.getItem(docKey(id));
    if (!raw) throw new Error('Account not found.');
    return JSON.parse(raw) as LocalUserDoc;
  }

  write(doc: LocalUserDoc): void {
    this.storage.setItem(docKey(doc.id), JSON.stringify(doc));
    this.storage.setItem(USERS_KEY, JSON.stringify({ ...this.index(), [doc.email.toLowerCase()]: doc.id }));
  }

  update(id: string, change: (doc: LocalUserDoc) => LocalUserDoc): void {
    this.write(change(this.read(id)));
  }

  delete(id: string): void {
    const doc = this.read(id);
    const { [doc.email.toLowerCase()]: _removed, ...rest } = this.index();
    this.storage.setItem(USERS_KEY, JSON.stringify(rest));
    this.storage.removeItem(docKey(id));
  }

  private index(): Record<string, string> {
    return JSON.parse(this.storage.getItem(USERS_KEY) ?? '{}') as Record<string, string>;
  }
}

export function hashPassword(password: string): Promise<string> {
  return sha256Hex(`ledger:${password}`);
}
