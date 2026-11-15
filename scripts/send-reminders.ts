/**
 * Reminder job, run every few minutes by GitHub Actions (.github/workflows/reminders.yml).
 *
 * For every user with reminders on, it works out which habits and timed tasks are due right now in
 * that user's time zone (src/domain/reminders.ts, the same rules the app uses), sends one push
 * notification per device, and records what was sent so nobody gets the same reminder twice.
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import webpush from 'web-push';
import { checkinsOf, habitFields, type DeviceDoc, type HabitDoc, type TaskMonthDoc } from '../src/data/firebase/habitDoc';
import { timeIn, todayIn } from '../src/domain/date';
import { dueReminders, dueTaskReminders, reminderMessage, taskReminderKey } from '../src/domain/reminders';
import { normaliseTask } from '../src/domain/tasks';
import type { Habit, Task, WeekStart } from '../src/domain/types';

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
  taskRemindersSent?: Record<string, string>;
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
async function notify(devices: { ref: DocumentReference; data: DeviceDoc }[], habits: Habit[], tasks: Task[]): Promise<number> {
  const payload = JSON.stringify({ ...reminderMessage(habits, tasks), url: '/', tag: 'ledger-reminder' });
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
  for (const [index, user] of users.docs.entries()) {
    const devicesSnap = await user.ref.collection('devices').get();
    const label = `Account ${index + 1}`; // no ids or emails in the public Actions log
    if (devicesSnap.empty) {
      console.log(`${label}: no devices with reminders on.`);
      continue;
    }
    const profile = user.data() as UserDoc;
    const timezone = profile.timezone || 'UTC';
    const today = todayIn(timezone, now);
    const time = timeIn(timezone, now);
    const habitDocs = (await user.ref.collection('habits').get()).docs.map((d) => d.data() as HabitDoc);
    const tasks = (await user.ref.collection('taskMonths').get()).docs.flatMap((d) =>
      ((d.data() as TaskMonthDoc).items ?? []).map(normaliseTask),
    );

    const habits = dueReminders({
      habits: habitDocs.map(habitFields),
      checkins: habitDocs.flatMap(checkinsOf),
      weekStart: profile.weekStart ?? 'monday',
      today,
      accountCreated: profile.createdAt ? todayIn(timezone, new Date(profile.createdAt)) : today,
      now: time,
      sent: profile.remindersSent ?? {},
    });
    const dueTasks = dueTaskReminders({ tasks, today, now: time, sent: profile.taskRemindersSent ?? {} });
    console.log(
      `${label}: ${devicesSnap.size} device(s), local time ${time} (${timezone}), ` +
        `${habits.length} habit and ${dueTasks.length} task reminder(s) due.`,
    );
    if (!habits.length && !dueTasks.length) continue;

    delivered += await notify(
      devicesSnap.docs.map((d) => ({ ref: d.ref, data: d.data() as DeviceDoc })),
      habits,
      dueTasks,
    );
    await user.ref.update({
      ...Object.fromEntries(habits.map((h) => [`remindersSent.${h.id}`, today])),
      ...Object.fromEntries(dueTasks.map((t) => [`taskRemindersSent.${t.id}`, taskReminderKey(t)])),
    });
  }
  console.log(`Checked ${users.size} accounts, delivered ${delivered} notifications.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
