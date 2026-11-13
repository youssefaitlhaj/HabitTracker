/**
 * Reminder job, run every few minutes by GitHub Actions (.github/workflows/reminders.yml).
 *
 * For every user with reminders on, it works out which habits are due right now in that user's
 * time zone (src/domain/reminders.ts, the same rules the app uses), sends one push notification
 * per device, and records what was sent so nobody gets the same reminder twice in a day.
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import webpush from 'web-push';
import { checkinsOf, habitFields, type DeviceDoc, type HabitDoc } from '../src/data/firebase/habitDoc';
import { timeIn, todayIn } from '../src/domain/date';
import { dueReminders, reminderMessage } from '../src/domain/reminders';
import type { Habit, WeekStart } from '../src/domain/types';

interface Config {
  serviceAccount: string;
  vapidPublic: string;
  vapidPrivate: string;
  vapidSubject: string;
}

interface UserDoc {
  timezone?: string;
  weekStart?: WeekStart;
  createdAt?: string;
  remindersSent?: Record<string, string>;
}

function readConfig(): Config | null {
  const { FIREBASE_SERVICE_ACCOUNT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!FIREBASE_SERVICE_ACCOUNT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null;
  return {
    serviceAccount: FIREBASE_SERVICE_ACCOUNT,
    vapidPublic: VAPID_PUBLIC_KEY,
    vapidPrivate: VAPID_PRIVATE_KEY,
    vapidSubject: VAPID_SUBJECT || 'mailto:reminders@example.com',
  };
}

/** Sends to every device; devices whose subscription has expired are removed. */
async function notify(devices: { ref: DocumentReference; data: DeviceDoc }[], habits: Habit[]): Promise<number> {
  const payload = JSON.stringify({ ...reminderMessage(habits), url: '/', tag: 'ledger-reminder' });
  const results = await Promise.all(
    devices.map(async ({ ref, data }) => {
      try {
        await webpush.sendNotification(data.subscription, payload, { TTL: 3600 });
        return 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await ref.delete();
        else console.error(`Push failed (${status ?? 'network'}) for device ${ref.id}`);
        return 0;
      }
    }),
  );
  return results.reduce<number>((a, b) => a + b, 0);
}

async function main(): Promise<void> {
  const config = readConfig();
  if (!config) {
    console.log('Reminders are not configured (missing secrets). Nothing to do.');
    return;
  }
  initializeApp({ credential: cert(JSON.parse(config.serviceAccount)) });
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublic, config.vapidPrivate);
  const db = getFirestore();
  const now = new Date();
  let delivered = 0;

  const users = await db.collection('users').get();
  for (const user of users.docs) {
    const devicesSnap = await user.ref.collection('devices').get();
    if (devicesSnap.empty) continue;
    const profile = user.data() as UserDoc;
    const timezone = profile.timezone || 'UTC';
    const today = todayIn(timezone, now);
    const habitDocs = (await user.ref.collection('habits').get()).docs.map((d) => d.data() as HabitDoc);

    const due = dueReminders({
      habits: habitDocs.map(habitFields),
      checkins: habitDocs.flatMap(checkinsOf),
      weekStart: profile.weekStart ?? 'monday',
      today,
      accountCreated: profile.createdAt ? todayIn(timezone, new Date(profile.createdAt)) : today,
      now: timeIn(timezone, now),
      sent: profile.remindersSent ?? {},
    });
    if (!due.length) continue;

    delivered += await notify(
      devicesSnap.docs.map((d) => ({ ref: d.ref, data: d.data() as DeviceDoc })),
      due,
    );
    await user.ref.update(Object.fromEntries(due.map((h) => [`remindersSent.${h.id}`, today])));
  }
  console.log(`Checked ${users.size} accounts, delivered ${delivered} notifications.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
