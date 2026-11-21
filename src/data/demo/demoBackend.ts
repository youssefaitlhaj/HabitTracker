import { detectTimeZone, todayIn } from '@/domain/date';
import type { AuthService, Backend, FeedbackSender, Session } from '../ports';
import { createLocalBackend } from '../local/localBackend';
import { LocalStore } from '../local/localStore';
import { DEMO_EMAIL, DEMO_USER_ID, demoAccount } from './demoData';

/**
 * Demo backend (/demo): the in-browser backend, already signed in to a sample account.
 * Everything the visitor changes stays in this tab. Account features (password, email,
 * deletion, reminders) need a real account; screens label them "Not in the demo".
 */

export const NOT_IN_DEMO = 'Not in the demo.';
const STORE_PREFIX = 'ledger.demo';

const notInDemo = (): Promise<never> => Promise.reject(new Error(NOT_IN_DEMO));

class DemoAuth implements AuthService {
  constructor(
    private readonly session: Session,
    private readonly exit: () => void,
  ) {}

  async getSession(): Promise<Session> {
    return this.session;
  }

  onSessionChange(): () => void {
    return () => undefined;
  }

  /** Signing out of the demo means leaving it. */
  async signOut(): Promise<void> {
    this.exit();
  }

  signUp = notInDemo;
  signIn = notInDemo;
  requestPasswordReset = notInDemo;
  updatePassword = notInDemo;
  changePassword = notInDemo;
  changeEmail = notInDemo;
}

export interface DemoOptions {
  /** Start again from the sample data, dropping earlier changes. */
  fresh: boolean;
  /** Called after the demo data is removed, to leave the demo. */
  onExit: () => void;
  /** Where visitors' feedback goes when they leave; none = no feedback step. */
  feedback?: FeedbackSender;
  storage?: Storage;
  timezone?: string;
  now?: Date;
}

export function createDemoBackend({ fresh, onExit, feedback, storage = sessionStorage, timezone = detectTimeZone(), now = new Date() }: DemoOptions): Backend {
  const store = new LocalStore(storage, STORE_PREFIX);
  if (fresh || !store.userIdByEmail(DEMO_EMAIL)) {
    store.clear();
    store.write(demoAccount(todayIn(timezone, now), timezone));
  }
  const local = createLocalBackend(store);
  return {
    kind: 'demo',
    capabilities: { globalSignOut: false, deletionGraceDays: 0 },
    feedback,
    auth: new DemoAuth({ userId: DEMO_USER_ID, email: DEMO_EMAIL }, () => {
      store.clear();
      onExit();
    }),
    repositoriesFor: (session) => local.repositoriesFor(session),
  };
}
